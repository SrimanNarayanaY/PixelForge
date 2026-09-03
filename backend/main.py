import io
import os
import base64
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from huggingface_hub import InferenceClient
from PIL import Image

# Load environment variables (.env)
load_dotenv()

app = FastAPI(title="PixelForge AI Engine", version="3.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN", "").strip()

PRIMARY_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell"
FALLBACK_IMAGE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
VISION_MODEL = "google/gemma-3-12b-it"


class GenerateRequest(BaseModel):
    prompt: Optional[str] = ""
    image: Optional[str] = None  # Base64 data URL or string


@app.get("/")
def health():
    return {
        "status": "online",
        "engine": "PixelForge Core",
        "ready": bool(HF_TOKEN),
    }


def prepare_image_data_uri(b64_str: str) -> tuple[str, io.BytesIO]:
    """Ensure image is properly formatted, resized, and returned as data URI."""
    if "," in b64_str:
        header, raw_b64 = b64_str.split(",", 1)
    else:
        raw_b64 = b64_str

    img_bytes = base64.b64decode(raw_b64)
    pil_img = Image.open(io.BytesIO(img_bytes))

    # Convert RGBA / CMYK to RGB
    if pil_img.mode in ("RGBA", "P", "CMYK"):
        pil_img = pil_img.convert("RGB")

    # Resize if too large (maintain aspect ratio)
    pil_img.thumbnail((768, 768), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=85)
    buf.seek(0)
    resized_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{resized_b64}"
    return data_uri, buf


def analyze_reference_image(client: InferenceClient, data_uri: str) -> str:
    """Analyze the uploaded reference image to extract subject and visual context."""
    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Describe the primary subject, visual composition, and key colors of this image "
                            "in a concise single sentence suitable as an image prompt descriptor."
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            }],
            max_tokens=60,
        )
        desc = response.choices[0].message.content.strip()
        # Clean any markdown bullets
        desc = desc.replace("\n", " ").replace("*", "").strip()
        return desc
    except Exception as e:
        print(f"Vision analysis fallback: {e}")
        return "a visual scene matching the uploaded reference image"


def generate_flux_image(client: InferenceClient, prompt: str) -> str:
    """Generate image using FLUX.1 with fallback to SDXL."""
    try:
        img = client.text_to_image(prompt, model=PRIMARY_IMAGE_MODEL)
    except Exception as primary_err:
        print(f"Primary model error: {primary_err}. Falling back to SDXL...")
        img = client.text_to_image(prompt, model=FALLBACK_IMAGE_MODEL)

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


@app.post("/generate")
def generate(req: GenerateRequest):
    user_prompt = (req.prompt or "").strip()
    has_image = bool(req.image and req.image.strip())

    if not user_prompt and not has_image:
        raise HTTPException(
            status_code=400,
            detail="Please provide a prompt or upload an image to generate.",
        )

    if not HF_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Engine token not configured. Please check backend .env file.",
        )

    client = InferenceClient(token=HF_TOKEN)

    # 1. If user uploaded a reference image
    if has_image:
        print("Processing reference image upload...")
        try:
            data_uri, _ = prepare_image_data_uri(req.image)
            visual_context = analyze_reference_image(client, data_uri)
            print(f"Extracted image context: {visual_context}")

            if user_prompt:
                final_prompt = (
                    f"{user_prompt}, inspired by and transforming {visual_context}, "
                    "masterpiece, detailed, cinematic lighting, 8k render"
                )
            else:
                final_prompt = (
                    f"A stunning high-definition creative reimagining of {visual_context}, "
                    "masterpiece, highly detailed, dramatic lighting, 8k resolution"
                )
        except Exception as img_err:
            print(f"Error handling uploaded image: {img_err}")
            if user_prompt:
                final_prompt = user_prompt
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Failed to read uploaded image. Please try another image.",
                )
    else:
        # Standard text-to-image
        final_prompt = user_prompt

    print(f"Final generation prompt: {final_prompt[:80]}...")

    try:
        b64_output = generate_flux_image(client, final_prompt)
        return JSONResponse({"image": b64_output})
    except Exception as gen_err:
        print(f"Generation failed: {gen_err}")
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed: {gen_err}",
        )
