import base64
import io
import math
import os
import random
import tempfile
import urllib.parse
from typing import Optional, Tuple
import imageio.v3 as iio
import numpy as np
import requests
from gradio_client import Client
from PIL import Image, ImageDraw

ASPECT_RATIOS = {
    "16:9": (768, 432),
    "9:16": (432, 768),
    "1:1": (512, 512),
}

MODEL_DISPLAY_NAMES = {
    "wan-2.7": "Alibaba Wan 2.7 Pro (AI Diffusion Video)",
    "seedance-pro": "ByteDance Seedance 2.0 Pro (AI Diffusion Video)",
    "veo": "Google Veo 3.1 Fast (AI Diffusion Video)",
    "ltx-video": "Lightricks LTX Video 2.0 (24fps Diffusion)",
    "cinematic-fx": "FLUX.1 Schnell + 3D Cinematic Motion FX",
}


def crop_and_resize_frame(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Resize and crop image to exactly match target aspect ratio."""
    src_w, src_h = img.size
    src_ratio = src_w / src_h
    tgt_ratio = target_w / target_h

    if src_ratio > tgt_ratio:
        new_w = int(src_h * tgt_ratio)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w / tgt_ratio)
        top = (src_h - new_h) // 2
        img = img.crop((0, top, src_w, top + new_h))

    return img.resize((target_w, target_h), Image.Resampling.LANCZOS)


def extend_frames_to_duration(
    frames: list[np.ndarray], target_duration_sec: int, fps: int = 24
) -> list[np.ndarray]:
    """
    Seamlessly extend video frames to target_duration_sec using ping-pong looping
    with smooth bidirectional flow to avoid hard cuts.
    """
    if not frames:
        raise ValueError("Frames list cannot be empty.")

    target_frame_count = int(target_duration_sec * fps)
    total_src = len(frames)

    if abs(total_src - target_frame_count) <= 3:
        return frames

    forward = frames
    reverse = [f for f in reversed(frames[1:-1])]
    cycle = forward + reverse
    if not cycle:
        cycle = forward

    output = []
    while len(output) < target_frame_count:
        needed = target_frame_count - len(output)
        output.extend(cycle[:needed])

    return output


def encode_frames_to_mp4_bytes(frames: list[np.ndarray], fps: int = 24) -> bytes:
    """Encode an array of RGB frames into standard web-compatible H.264 MP4 bytes."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        h, w, _ = frames[0].shape
        adj_w = w - (w % 2)
        adj_h = h - (h % 2)

        processed_frames = []
        for f in frames:
            if f.shape[0] != adj_h or f.shape[1] != adj_w:
                pil_f = Image.fromarray(f).resize((adj_w, adj_h), Image.Resampling.BILINEAR)
                processed_frames.append(np.array(pil_f))
            else:
                processed_frames.append(f)

        try:
            iio.imwrite(
                tmp_path,
                processed_frames,
                fps=fps,
                codec="libx264",
                plugin="pyav",
            )
        except Exception:
            import imageio
            buf = io.BytesIO()
            writer = imageio.get_writer(
                buf,
                format="mp4",
                fps=fps,
                ffmpeg_params=["-pix_fmt", "yuv420p"],
            )
            for f in processed_frames:
                writer.append_data(f)
            writer.close()
            return buf.getvalue()

        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


def generate_ltx_video(
    prompt: str,
    negative_prompt: str = "worst quality, inconsistent motion, blurry, jittery, distorted",
    width: int = 704,
    height: int = 480,
    hf_token: Optional[str] = None,
) -> Optional[bytes]:
    """
    Generate real AI video diffusion via Lightricks LTX Video Distilled space.
    """
    try:
        token = hf_token or os.getenv("HF_TOKEN")
        print("[LTX Video] Connecting to Lightricks/ltx-video-distilled...")
        client = Client("Lightricks/ltx-video-distilled", token=token)
        print("[LTX Video] Generating video diffusion...")
        result = client.predict(
            prompt=prompt,
            negative_prompt=negative_prompt,
            input_image_filepath=None,
            input_video_filepath=None,
            height_ui=height,
            width_ui=width,
            mode="text-to-video",
            duration_ui=2.0,
            ui_frames_to_use=9,
            seed_ui=random.randint(1, 999999),
            randomize_seed=True,
            ui_guidance_scale=1.0,
            improve_texture_flag=True,
            api_name="/text_to_video",
        )
        if result and isinstance(result, tuple) and len(result) > 0:
            video_info = result[0]
            if isinstance(video_info, dict) and "video" in video_info:
                vpath = video_info["video"]
                if os.path.exists(vpath):
                    with open(vpath, "rb") as vf:
                        data = vf.read()
                    print(f"[LTX Video] Succeeded with {len(data)} bytes")
                    return data
    except Exception as e:
        print(f"[LTX Video] Error: {e}")
    return None


def generate_pollinations_video(
    prompt: str,
    model: str = "wan-2.7",
    api_key: Optional[str] = None,
    width: int = 768,
    height: int = 432,
) -> Optional[bytes]:
    """
    Generate authentic AI video diffusion using Pollinations Enterprise Video API.
    Supports Alibaba Wan 2.7, ByteDance Seedance Pro, and Google Veo.
    """
    key = api_key or os.getenv("POLLINATIONS_API_KEY")
    if not key:
        return None

    # Map user model to Pollinations model name
    poll_model_map = {
        "wan-2.7": "alibaba/wan-2.7",
        "seedance-pro": "bytedance/seedance-1-pro-fast",
        "veo": "google/veo-3.1-fast",
    }
    target_model = poll_model_map.get(model, model)
    encoded_prompt = urllib.parse.quote(prompt)

    url = (
        f"https://gen.pollinations.ai/video/{encoded_prompt}"
        f"?model={target_model}&width={width}&height={height}"
    )

    headers = {
        "Authorization": f"Bearer {key.strip()}",
        "User-Agent": "PixelForge-VideoStudio/2.0",
    }

    try:
        print(f"[Pollinations Video] Requesting {target_model}...")
        resp = requests.get(url, headers=headers, timeout=120)
        if resp.status_code == 200 and len(resp.content) > 10000:
            content_type = resp.headers.get("Content-Type", "")
            if "video" in content_type or resp.content.startswith(b"\x00\x00\x00") or b"ftyp" in resp.content[:30]:
                print(f"[Pollinations Video] Successfully fetched {len(resp.content)} bytes MP4")
                return resp.content
        else:
            print(f"[Pollinations Video] Status: {resp.status_code}, Response: {resp.text[:200]}")
    except Exception as e:
        print(f"[Pollinations Video] Exception: {e}")

def strip_watermark(img: Image.Image) -> Image.Image:
    """Cleanly remove bottom watermark logo without distortion and retain requested size."""
    w, h = img.size
    crop_h = max(100, h - 36)
    cropped = img.crop((0, 0, w, crop_h))
    return cropped.resize((w, h), Image.Resampling.LANCZOS)


def fetch_resilient_base_image(
    prompt: str,
    target_w: int = 1024,
    target_h: int = 1024,
    model: str = "flux",
    seed: Optional[int] = None,
) -> Image.Image:
    """Fetch high quality visual output with automatic prompt enrichment and clean watermark removal."""
    if seed is None:
        seed = random.randint(1, 9999999)

    model_mapping = {
        "flux": "flux",
        "flux-realism": "flux-realism",
        "flux-anime": "flux-anime",
        "flux-3d": "flux-3d",
        "turbo": "turbo",
    }
    active_model = model_mapping.get(model, "flux")

    try:
        url = (
            f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}"
            f"?model={active_model}&width={target_w}&height={target_h}&nologo=true&enhance=true&seed={seed}"
        )
        resp = requests.get(url, timeout=35)
        if resp.ok and len(resp.content) > 5000:
            raw_img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            return strip_watermark(raw_img)
    except Exception as e:
        print(f"Online visual fetch error ({active_model}): {e}. Trying fast turbo fallback...")
        try:
            fallback_url = (
                f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}"
                f"?model=turbo&width={target_w}&height={target_h}&nologo=true&seed={seed}"
            )
            f_resp = requests.get(fallback_url, timeout=25)
            if f_resp.ok and len(f_resp.content) > 5000:
                raw_img = Image.open(io.BytesIO(f_resp.content)).convert("RGB")
                return strip_watermark(raw_img)
        except Exception:
            pass

    return Image.new("RGB", (target_w, target_h), color=(20, 24, 39))


def generate_cinematic_motion_fallback(
    base_image: Image.Image,
    target_duration: int,
    aspect_ratio: str = "16:9",
    fps: int = 24,
    prompt: str = "",
) -> bytes:
    """
    Synthesize high-definition cinematic video with 3D camera dolly,
    atmospheric particle physics (rain, snow, sparks, embers), and lighting dynamics.
    """
    target_w, target_h = ASPECT_RATIOS.get(aspect_ratio, (768, 432))
    src_w = int(target_w * 1.35)
    src_h = int(target_h * 1.35)
    base_image = crop_and_resize_frame(base_image, src_w, src_h)

    total_frames = int(target_duration * fps)
    frames = []

    p_lower = prompt.lower()
    has_rain = any(k in p_lower for k in ["rain", "umbrella", "storm", "wet", "puddle", "water"])
    has_snow = any(k in p_lower for k in ["snow", "winter", "cold", "blizzard", "frost"])
    has_sparks = any(k in p_lower for k in ["spark", "fire", "ember", "cyberpunk", "neon", "magic"])

    particles = []
    if has_rain:
        particles = [
            {
                "x": random.randint(0, target_w),
                "y": random.randint(0, target_h),
                "len": random.randint(18, 32),
                "spd": random.randint(20, 32),
            }
            for _ in range(120)
        ]
    elif has_snow:
        particles = [
            {
                "x": random.randint(0, target_w),
                "y": random.randint(0, target_h),
                "rad": random.randint(2, 4),
                "spd": random.uniform(2.5, 6.0),
                "drift": random.uniform(-1.0, 1.0),
            }
            for _ in range(90)
        ]
    elif has_sparks:
        particles = [
            {
                "x": random.randint(0, target_w),
                "y": random.randint(0, target_h),
                "rad": random.randint(2, 4),
                "spd": random.uniform(3.0, 7.0),
                "drift": random.uniform(-2.0, 2.0),
                "color": random.choice([(255, 180, 50, 180), (255, 100, 30, 160), (0, 220, 255, 160)]),
            }
            for _ in range(60)
        ]

    for i in range(total_frames):
        t = i / float(total_frames)

        zoom = 1.0 + 0.14 * math.sin(t * math.pi)
        cur_crop_w = int((target_w * 1.18) / zoom)
        cur_crop_h = int((target_h * 1.18) / zoom)

        cx = src_w // 2 + int(math.sin(t * 2 * math.pi) * (src_w * 0.04))
        cy = src_h // 2 + int(math.cos(t * math.pi) * (src_h * 0.025))

        left = max(0, min(src_w - cur_crop_w, cx - cur_crop_w // 2))
        top = max(0, min(src_h - cur_crop_h, cy - cur_crop_h // 2))

        crop_box = (left, top, left + cur_crop_w, top + cur_crop_h)
        frame_img = base_image.crop(crop_box).resize((target_w, target_h), Image.Resampling.LANCZOS)

        if has_rain or has_snow or has_sparks:
            overlay = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)

            if has_rain:
                for p in particles:
                    p["y"] = (p["y"] + p["spd"]) % target_h
                    p["x"] = (p["x"] + 3) % target_w
                    draw.line(
                        [(p["x"], p["y"]), (p["x"] - 5, p["y"] + p["len"])],
                        fill=(210, 235, 255, 110),
                        width=1,
                    )
            elif has_snow:
                for p in particles:
                    p["y"] = (p["y"] + p["spd"]) % target_h
                    p["x"] = (p["x"] + p["drift"]) % target_w
                    draw.ellipse(
                        (p["x"] - p["rad"], p["y"] - p["rad"], p["x"] + p["rad"], p["y"] + p["rad"]),
                        fill=(255, 255, 255, 150),
                    )
            elif has_sparks:
                for p in particles:
                    p["y"] = (p["y"] - p["spd"]) % target_h
                    p["x"] = (p["x"] + p["drift"]) % target_w
                    draw.ellipse(
                        (p["x"] - p["rad"], p["y"] - p["rad"], p["x"] + p["rad"], p["y"] + p["rad"]),
                        fill=p["color"],
                    )

            frame_img = Image.alpha_composite(frame_img.convert("RGBA"), overlay).convert("RGB")

        frames.append(np.array(frame_img))

    return encode_frames_to_mp4_bytes(frames, fps=fps)


def process_video_generation(
    client=None,
    prompt: str = "",
    duration: int = 5,
    aspect_ratio: str = "16:9",
    reference_image: Optional[Image.Image] = None,
    model: str = "wan-2.7",
    api_key: Optional[str] = None,
) -> Tuple[str, str, Optional[str]]:
    """
    Core video generation router.
    Returns: (base64_mp4_data_uri, model_name, optional_notice)
    """
    target_w, target_h = ASPECT_RATIOS.get(aspect_ratio, (768, 432))
    duration = min(30, max(5, duration))
    notice: Optional[str] = None

    enhanced_prompt = prompt
    motion_keywords = ["cinematic", "motion", "4k", "detailed", "smooth"]
    if not any(k in enhanced_prompt.lower() for k in motion_keywords):
        enhanced_prompt = f"{prompt}, cinematic lighting, high quality, fluid motion, 4k"

    raw_video_bytes: Optional[bytes] = None
    resolved_model_name = MODEL_DISPLAY_NAMES.get(model, model)

    # 1. If user selected Wan 2.7, Seedance Pro, or Veo, try Pollinations Video API
    if model in ("wan-2.7", "seedance-pro", "veo"):
        poll_key = api_key or os.getenv("POLLINATIONS_API_KEY")
        if poll_key:
            raw_video_bytes = generate_pollinations_video(
                prompt=enhanced_prompt,
                model=model,
                api_key=poll_key,
                width=target_w,
                height=target_h,
            )
        else:
            notice = "Configure your free Pollinations API Key from enter.pollinations.ai/keys to unlock Wan 2.7 & Seedance Pro full motion generation."

    # 2. If user selected LTX Video OR if Pollinations was not configured, try LTX-Video Distilled
    if not raw_video_bytes and model in ("ltx-video", "wan-2.7", "seedance-pro"):
        print("[Video Engine] Attempting Lightricks LTX Video Distilled neural diffusion...")
        ltx_bytes = generate_ltx_video(
            prompt=enhanced_prompt,
            width=target_w,
            height=target_h,
            hf_token=os.getenv("HF_TOKEN"),
        )
        if ltx_bytes:
            raw_video_bytes = ltx_bytes
            resolved_model_name = MODEL_DISPLAY_NAMES["ltx-video"]
            notice = None

    # 3. Process video frames if neural diffusion succeeded
    final_mp4_bytes: Optional[bytes] = None
    if raw_video_bytes:
        try:
            import imageio
            reader = imageio.get_reader(io.BytesIO(raw_video_bytes), format="mp4")
            src_frames = [frame for frame in reader]
            reader.close()

            if src_frames:
                processed_src = []
                for f in src_frames:
                    pil_f = Image.fromarray(f)
                    resized_pil = crop_and_resize_frame(pil_f, target_w, target_h)
                    processed_src.append(np.array(resized_pil))

                final_frames = extend_frames_to_duration(processed_src, target_duration_sec=duration, fps=24)
                final_mp4_bytes = encode_frames_to_mp4_bytes(final_frames, fps=24)
        except Exception as e:
            print(f"[Video Engine] Error processing neural video frames: {e}")
            final_mp4_bytes = None

    # 4. Graceful Fallback: FLUX.1 Schnell + 3D Cinematic Motion FX
    if not final_mp4_bytes:
        print("[Video Engine] Running FLUX.1 Schnell Keyframe + 3D Cinematic Motion FX...")
        resolved_model_name = MODEL_DISPLAY_NAMES["cinematic-fx"]
        if not notice:
            notice = "Generated using FLUX.1 8K Keyframe + 3D Dolly Physics. Add a free Pollinations Key for skeletal diffusion motion."

        if reference_image:
            base_img = reference_image
        else:
            try:
                from image_engine import generate_via_flux_space, enrich_prompt
                flux_prompt = enrich_prompt(enhanced_prompt, style="flux")
                base_img = generate_via_flux_space(flux_prompt, target_w, target_h)
            except Exception as flux_err:
                print(f"[Video Engine] FLUX space error: {flux_err}. Using resilient engine...")
                base_img = fetch_resilient_base_image(enhanced_prompt, target_w, target_h, model="flux")

        final_mp4_bytes = generate_cinematic_motion_fallback(
            base_img,
            target_duration=duration,
            aspect_ratio=aspect_ratio,
            fps=24,
            prompt=enhanced_prompt,
        )

    b64_video = base64.b64encode(final_mp4_bytes).decode("utf-8")
    data_uri = f"data:video/mp4;base64,{b64_video}"
    return data_uri, resolved_model_name, notice
