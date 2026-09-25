import os
import io
import base64
import random
from typing import Optional, Tuple
from PIL import Image

_flux_client = None
_sd35_client = None

def get_flux_client():
    global _flux_client
    if _flux_client is None:
        from gradio_client import Client
        _flux_client = Client("black-forest-labs/FLUX.1-schnell")
    return _flux_client

def get_sd35_client():
    global _sd35_client
    if _sd35_client is None:
        from gradio_client import Client
        _sd35_client = Client("stabilityai/stable-diffusion-3.5-large")
    return _sd35_client

def enrich_prompt(prompt: str, style: str = "flux") -> str:
    """Enrich simple prompts to yield breathtaking, award-winning visual quality."""
    p_lower = prompt.lower()
    style_boosters = {
        "flux": "cinematic lighting, ultra-realistic photography, sharp focus, 8k resolution, highly detailed, realistic skin texture, masterpiece",
        "flux-realism": "hyperrealistic candid portrait photography, 85mm lens, natural soft lighting, authentic skin pores, 8k UHD masterpiece",
        "flux-anime": "breathtaking anime artwork, Makoto Shinkai aesthetic, vibrant colors, detailed anime illustration, 4k masterpiece",
        "flux-3d": "Pixar Disney 3D animation style, vibrant soft lighting, smooth 3D render, octane render, 8k masterpiece",
        "sd35": "photorealistic masterpiece, highly detailed, volumetric cinematic lighting, 8k render, professional photography",
        "turbo": "sharp high definition render, detailed, 4k",
    }
    booster = style_boosters.get(style, style_boosters["flux"])
    if not any(k in p_lower for k in ["photorealistic", "masterpiece", "8k", "cinematic", "octane", "manga", "anime"]):
        return f"{prompt}, {booster}"
    return prompt

def generate_via_flux_space(prompt: str, width: int = 1024, height: int = 1024) -> Image.Image:
    client = get_flux_client()
    seed = random.randint(1, 2147483647)
    w = max(512, min(1024, (width // 16) * 16))
    h = max(512, min(1024, (height // 16) * 16))

    result = client.predict(
        prompt=prompt,
        seed=seed,
        randomize_seed=True,
        width=w,
        height=h,
        num_inference_steps=4,
        api_name="/infer"
    )
    img_entry = result[0] if isinstance(result, (tuple, list)) else result
    img_path = img_entry.get("path") if isinstance(img_entry, dict) else img_entry
    return Image.open(img_path).convert("RGB")

def generate_via_sd35_space(prompt: str, width: int = 1024, height: int = 1024) -> Image.Image:
    client = get_sd35_client()
    seed = random.randint(1, 2147483647)
    w = max(512, min(1024, (width // 16) * 16))
    h = max(512, min(1024, (height // 16) * 16))

    result = client.predict(
        prompt=prompt,
        negative_prompt="blurry, distorted face, bad anatomy, low quality, artifacts, watermark",
        seed=seed,
        randomize_seed=True,
        width=w,
        height=h,
        guidance_scale=4.5,
        num_inference_steps=28,
        api_name="/infer"
    )
    img_entry = result[0] if isinstance(result, (tuple, list)) else result
    img_path = img_entry.get("path") if isinstance(img_entry, dict) else img_entry
    return Image.open(img_path).convert("RGB")

def generate_flagship_image(
    prompt: str,
    model: str = "flux",
    width: int = 1024,
    height: int = 1024
) -> Tuple[str, str]:
    """
    Main image generation router.
    Uses official FLUX.1 Schnell and Stable Diffusion 3.5 Large.
    Returns (base64_png, display_name).
    """
    model_key = (model or "flux").lower().strip()
    enriched = enrich_prompt(prompt, style=model_key)
    print(f"[Engine] Generating image with enriched prompt: {enriched[:90]}... (model: {model_key})")

    model_display_names = {
        "flux": "FLUX.1 Schnell (Photorealistic)",
        "sd35": "Stable Diffusion 3.5 Large (Studio HD)",
        "flux-realism": "FLUX Realism (Cinematic Portrait)",
        "flux-anime": "FLUX Anime (Makoto Shinkai)",
        "flux-3d": "FLUX 3D (Pixar CGI)",
        "turbo": "Turbo Speed (Fast)",
    }
    display_name = model_display_names.get(model_key, "FLUX.1 Schnell")

    img: Optional[Image.Image] = None

    if model_key == "sd35":
        try:
            print("[Engine] Invoking Stability AI SD 3.5 Large...")
            img = generate_via_sd35_space(enriched, width, height)
        except Exception as sd_err:
            print(f"SD 3.5 error: {sd_err}. Falling back to FLUX.1 Schnell...")
            try:
                img = generate_via_flux_space(enriched, width, height)
                display_name = "FLUX.1 Schnell (Fallback)"
            except Exception as flux_err:
                print(f"FLUX fallback error: {flux_err}")

    if img is None:
        try:
            print("[Engine] Invoking Black Forest Labs FLUX.1 Schnell...")
            img = generate_via_flux_space(enriched, width, height)
        except Exception as flux_err:
            print(f"FLUX.1 error: {flux_err}. Falling back to SD 3.5 Large...")
            try:
                img = generate_via_sd35_space(enriched, width, height)
                display_name = "SD 3.5 Large (Fallback)"
            except Exception as sd_err:
                print(f"SD 3.5 fallback error: {sd_err}")
                from video_engine import fetch_resilient_base_image
                img = fetch_resilient_base_image(enriched, width, height, model=model_key)
                display_name = "PixelForge Fast Engine"

    # Encode to base64 PNG
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    b64_output = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return b64_output, display_name
