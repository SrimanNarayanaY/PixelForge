# PixelForge Video Studio Design Spec

**Date:** 2026-09-03  
**Status:** Approved  
**Author:** Pair Programming Session  

---

## 1. Overview
PixelForge is expanding from an AI image generator to a full creative suite with a dedicated **Video Studio**. Users can generate videos up to 30 seconds from a text prompt or from an uploaded reference image/video using Hugging Face AI models.

---

## 2. Key Features
1. **Studio Mode Switcher:** Tabbed UI between **Image Forge** and **Video Studio**.
2. **Flexible Input Modalities:**
   - **Text-to-Video:** Direct prompt input with artistic style enhancers.
   - **Image-to-Video / Video-to-Video:** Upload reference media (PNG, JPG, MP4, WEBP) to guide subject, aesthetic, and motion.
3. **Configurable Video Duration:**
   - Preset buttons: **5s**, **10s**, **15s**, and **30s (Max)**.
4. **Aspect Ratio Options:**
   - 16:9 (Landscape / YouTube / Desktop)
   - 9:16 (Portrait / Reels / TikTok)
   - 1:1 (Square / Instagram)
5. **Interactive Video Player:**
   - Custom player with scrub bar, duration timer, loop toggle, full screen, and direct MP4 download.
6. **Live Multi-Stage Progress:**
   - Visual step indicator: Prompt analysis → Model inference → Clip extension/stitching → MP4 encoding.

---

## 3. Architecture & Data Flow

### 3.1 Backend (`FastAPI`)
- **Endpoint:** `POST /generate-video`
- **Request Body:**
  ```json
  {
    "prompt": "Cyberpunk street in rain with neon reflections",
    "media": "data:image/jpeg;base64,...", // Optional reference image/video
    "duration": 30,                       // 5, 10, 15, or 30 seconds
    "aspect_ratio": "16:9"                // "16:9", "9:16", "1:1"
  }
  ```
- **Processing Logic:**
  1. If reference media is supplied, inspect media context using `google/gemma-3-12b-it` or keyframe extraction.
  2. Synthesize motion prompt with style and continuity parameters.
  3. Invoke Hugging Face Video Inference models:
     - Primary: `Wan-AI/Wan2.1-T2V-14B` / `THUDM/CogVideoX-5b`
     - Fallback: `damo-vilab/text-to-video-ms-1.7b`
  4. Duration handling: If duration > base model clip length (e.g. 10s, 15s, 30s), perform clip chaining and motion extension using video synthesis/interpolation into a final MP4.
  5. Return encoded MP4 base64 or stream response.

### 3.2 Frontend (`Next.js` / React)
- State management for active studio mode (`image` vs `video`).
- Video Studio panel with dropzone for images/videos.
- Duration and aspect ratio selector pills.
- Video preview container supporting standard HTML5 video playback with smooth loading skeletons and error fallbacks.

---

## 4. Dependencies & Technical Requirements
- Python: `fastapi`, `huggingface_hub`, `opencv-python-headless` (or `imageio[ffmpeg]`), `pillow`, `numpy`.
- Frontend: Tailwind CSS, Lucide icons, HTML5 Video API.

---

## 5. Verification Plan
- Verify `/generate-video` API endpoint response with cURL / Postman.
- Verify 5s, 10s, 15s, and 30s generation and playback on the frontend.
- Verify reference image/video upload functionality.
- Verify responsive layout across mobile and desktop viewports.
