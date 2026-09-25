# PixelForge: FLUX.1 Image Engine & Model Selector Specification

## 1. Overview
The current image generation fell back to a default low-resolution NVIDIA Sana model with a hardcoded static seed (`seed=42`) and watermark due to Hugging Face free-tier token credit exhaustion (HTTP 402 Payment Required). This caused distorted faces, cartoonish creepiness, and watermarks (`pollinations.ai`).

This design upgrades PixelForge with:
1. **FLUX.1 as the Primary Image Engine**: Utilizing state-of-the-art FLUX.1 Schnell and specialized FLUX checkpoints.
2. **AI Model Selector Dropdown in UI**: Allowing users to select between Photorealistic, Realism, Anime, 3D CGI, and Turbo models.
3. **Automated Prompt Quality Booster**: Enriching brief user prompts (e.g. "Boy with umbrella") with cinematic lighting, depth, and detail descriptors.
4. **Clean Watermark Stripper**: Ensuring all generated and downloaded images are 100% clean and free of watermarks.
5. **Random Seed Generation**: Ensuring every single prompt execution produces unique, high-detail outputs.

---

## 2. Architecture & Backend Design

### 2.1 Model Registry
The backend will register the following high-grade free models:
- `flux` (Default): FLUX.1 Schnell - State of the art realism, intricate facial features, and photorealism.
- `flux-realism`: Specialized photorealistic portraiture and environmental lighting.
- `flux-anime`: Clean Japanese anime/manga aesthetic.
- `flux-3d`: Pixar / Disney / CGI 3D cinematic render style.
- `turbo`: Ultra-fast generation for rapid prototyping.

### 2.2 API Contract (`/generate`)
**Request:**
```json
{
  "prompt": "Boy with umbrella",
  "image": "data:image/jpeg;base64,...", // Optional reference
  "model": "flux" // "flux" | "flux-realism" | "flux-anime" | "flux-3d" | "turbo"
}
```

**Response:**
```json
{
  "image": "<base64_png>",
  "model": "FLUX.1 Schnell (Photorealistic)"
}
```

### 2.3 Image Processing Pipeline
1. **Prompt Sanitization & Correction**: Spelling fixes via `prompt_corrector.py`.
2. **Prompt Quality Enhancement**: Append visual enhancement cues (e.g., `cinematic lighting, photorealistic, 8k resolution, highly detailed`) tailored to the selected model style.
3. **Dynamic Seed**: Pick `random.randint(1, 9999999)`.
4. **Fetch**: Request high-resolution visual from FLUX.1 engine with `model={model}&enhance=true&seed={seed}`.
5. **Watermark Cleaner**: Automatically crop bottom watermark margin and resample with `LANCZOS` to maintain target dimensions cleanly.
6. **Return**: Deliver base64 encoded PNG.

---

## 3. Frontend Design

### 3.1 Model Selector Component
Place a sleek glassmorphic model selection bar inside the Image Forge panel above the prompt textarea:
- Preset options with icons and descriptions:
  - 🌟 **FLUX.1 Schnell** (Photorealistic Ultra-HD)
  - 📸 **FLUX Realism** (Lifelike Portraits)
  - 🎨 **Anime Studio** (Japanese Anime Style)
  - 🔮 **Cinematic 3D** (CGI & Pixar Style)
  - ⚡ **Turbo Instant** (Lightning Fast)
- Selected model state saved in local React state and passed to `/generate`.

### 3.2 Result Display
- Creation badge updated to show the exact model used (e.g., `✓ Creation Complete • FLUX.1 Schnell`).
- High-res preview and 1-click clean download.

---

## 4. Verification & Testing
1. Test generation with simple prompt: `"Boy with umbrella"` -> Verify handsome realistic face, umbrella, rain reflections, and zero watermarks.
2. Test model switching: Switch to Anime or 3D and verify output style matches selected model.
3. Test reference image guidance: Upload reference image + prompt and ensure consistency.
