# FLUX.1 Image Engine & Model Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade PixelForge's image generation to the top-tier free FLUX.1 engine with customizable model choices (Photorealistic FLUX.1, Realism, Anime, 3D CGI, Turbo), automatic prompt visual enhancement, and clean watermark removal.

**Architecture:** 
- The backend FastAPI service (`/generate`) accepts `model` alongside `prompt` and optional reference `image`. It utilizes the FLUX.1 generation pipeline with prompt enrichment, dynamic random seeding, and an automatic bottom-watermark stripper before returning clean base64 PNG data.
- The Next.js frontend adds a stylish glassmorphic Model Selector inside the Image Forge view, allowing users to pick their visual style, and displays the active model badge upon generation.

**Tech Stack:** Python 3.12, FastAPI, Pillow (PIL), Requests, Next.js 15, React, Tailwind CSS.

## Global Constraints
- Must be 100% free with no depleted HuggingFace token dependency.
- Output images must have zero watermarks and maintain high-fidelity details (photorealistic skin, sharp focus, proper lighting).
- Backwards compatible with existing image and video generation endpoints.

---

### Task 1: Backend FLUX.1 Multi-Model Engine & Watermark Stripper

**Files:**
- Modify: `c:/Users/91999/Desktop/PixelForge/my-ai-project/backend/main.py`
- Modify: `c:/Users/91999/Desktop/PixelForge/my-ai-project/backend/video_engine.py`
- Create: `c:/Users/91999/Desktop/PixelForge/my-ai-project/backend/test_flux_engine.py`

**Interfaces:**
- Consumes: `GenerateRequest(prompt, image, model)`
- Produces: `{"image": "<base64_png>", "model": "<model_display_name>", "seed": <int>}`

- [ ] **Step 1: Write test for FLUX.1 image generation and watermark removal**

```python
# backend/test_flux_engine.py
from video_engine import fetch_resilient_base_image

def test_fetch_resilient_base_image():
    prompt = "Boy with umbrella in heavy rain"
    img = fetch_resilient_base_image(prompt, 768, 768, model="flux")
    assert img is not None
    assert img.size == (768, 768)
    print("Test passed! Image size:", img.size)

if __name__ == "__main__":
    test_fetch_resilient_base_image()
```

- [ ] **Step 2: Run test to observe current behavior/failure**
Run: `.\venv\Scripts\python.exe test_flux_engine.py`

- [ ] **Step 3: Update `video_engine.py` and `main.py` with FLUX.1 models and watermark cleaner**
Implement `clean_watermark`, dynamic seeding, model style mappings, and enhance `/generate` handler.

- [ ] **Step 4: Run test to verify it passes**
Run: `.\venv\Scripts\python.exe test_flux_engine.py`

- [ ] **Step 5: Commit backend changes**
```bash
git add backend/main.py backend/video_engine.py backend/test_flux_engine.py
git commit -m "feat(backend): add FLUX.1 engine, model selector, prompt booster, and watermark cleaner"
```

---

### Task 2: Frontend Model Selector Component & Integration

**Files:**
- Modify: `c:/Users/91999/Desktop/PixelForge/my-ai-project/frontend/src/app/page.tsx`

**Interfaces:**
- Sends: `POST /generate` with `{ prompt, image, model }`
- Receives: `{ image, model }` and renders with badge

- [ ] **Step 1: Add image model state and preset definitions to `page.tsx`**
Define `IMAGE_MODELS` with:
- `flux`: FLUX.1 Schnell (Photorealistic Ultra-HD)
- `flux-realism`: FLUX Realism (Cinematic Portraits)
- `flux-anime`: Anime & Manga Art
- `flux-3d`: 3D Pixar / CGI Render
- `turbo`: Turbo Speed

- [ ] **Step 2: Add Model Selector UI to Image Forge Panel**
Render glassmorphic selector pills above the prompt input.

- [ ] **Step 3: Pass selected model to `/generate` API call and update result card**
Send `model: selectedModel` in payload and display the model badge in the result card.

- [ ] **Step 4: Verify Frontend compilation and rendering**
Run: `npm run build` or test locally in browser.

- [ ] **Step 5: Commit frontend changes**
```bash
git add frontend/src/app/page.tsx
git commit -m "feat(frontend): add AI model selector for Image Forge"
```
