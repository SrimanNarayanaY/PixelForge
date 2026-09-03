# PixelForge AI Video Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dedicated AI Video Studio in PixelForge enabling users to generate up to 30-second videos from text prompts or uploaded images/videos using Hugging Face models.

**Architecture:** 
- Backend: FastAPI `/generate-video` endpoint leveraging Hugging Face Inference (`Wan2.1` / `damo-vilab` / `CogVideoX`) alongside an `imageio[ffmpeg]` video synthesis pipeline for extending, resizing, and chaining clips up to 30 seconds into standard MP4.
- Frontend: Next.js tabbed interface (`Image Forge` / `Video Studio`), with duration selector (5s, 10s, 15s, 30s), aspect ratio controls (16:9, 9:16, 1:1), live progress status, and a custom HTML5 video player with download capability.

**Tech Stack:** Next.js 15, React, Tailwind CSS, FastAPI, Hugging Face Inference API, `imageio[ffmpeg]`, Python 3.12.

## Global Constraints
- Target workspace: `c:/Users/91999/Desktop/PixelForge/my-ai-project`
- Python runtime: `backend/venv/Scripts/python.exe`
- Preserves all existing Image Generation features without regression
- Duration support: 5s, 10s, 15s, 30s max
- Clean MP4 output playable directly in browser without external codecs

---

### Task 1: Backend Video Processing Pipeline & Dependencies
**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/video_engine.py`
- Create: `backend/test_video_pipeline.py`

**Interfaces:**
- Produces: `generate_video_clip(prompt: str, media_b64: Optional[str], duration: int, aspect_ratio: str, hf_token: str) -> str` (returns base64-encoded MP4)

- [ ] **Step 1: Update requirements.txt and install imageio[ffmpeg] in venv**
  Add `imageio[ffmpeg]` and `numpy` to requirements and run pip install.
- [ ] **Step 2: Create backend/video_engine.py**
  Implement Hugging Face video inference call with fallback and synthetic frame extension pipeline to guarantee smooth 5s-30s playback even when serverless API has limits.
- [ ] **Step 3: Create backend/test_video_pipeline.py and run standalone verification**
  Run test script to verify MP4 video creation, duration validation (up to 30s), and base64 encoding.
- [ ] **Step 4: Commit changes to Git**

---

### Task 2: FastAPI `/generate-video` API Endpoint
**Files:**
- Modify: `backend/main.py`
- Modify: `backend/test_video_pipeline.py`

**Interfaces:**
- Consumes: `video_engine.generate_video_clip`
- Produces: `POST /generate-video` returning `{"video": "data:video/mp4;base64,...", "duration": int, "model": str}`

- [ ] **Step 1: Define `GenerateVideoRequest` Pydantic model**
  Fields: `prompt: Optional[str]`, `media: Optional[str]`, `duration: int = 5`, `aspect_ratio: str = "16:9"`.
- [ ] **Step 2: Implement `@app.post("/generate-video")` in main.py**
  Add input validation, token checking, vision context extraction if reference image/video is provided, and error formatting.
- [ ] **Step 3: Test endpoint with automated curl/python request**
  Verify `/generate-video` returns 200 with valid MP4 base64 data.
- [ ] **Step 4: Commit changes to Git**

---

### Task 3: Frontend Dual Studio UI & Video Player
**Files:**
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: `POST http://localhost:7777/generate-video`
- Produces: Complete UI with Tab switcher, Video prompt form, duration pills (5s, 10s, 15s, 30s), aspect ratio picker, responsive video player, and download button.

- [ ] **Step 1: Add Studio Mode State & Header Tab Navigation**
  Toggle between `🎨 Image Forge` and `🎬 Video Studio`.
- [ ] **Step 2: Build Video Studio Input Controls**
  Add prompt bar, style quick-tags, media dropzone (images & videos), duration pills (5s, 10s, 15s, 30s), and aspect ratio selector (16:9, 9:16, 1:1).
- [ ] **Step 3: Build Custom Video Player & Multi-Stage Loading Feedback**
  Add video viewport with controls (play, pause, loop, seek, fullscreen, download) and step-by-step progress feedback (Prompt analysis -> Frame synthesis -> Duration chaining -> MP4 encoding).
- [ ] **Step 4: Verify frontend builds cleanly with `npm run build` or Next.js typecheck**
- [ ] **Step 5: Commit changes to Git**

---

### Task 4: End-to-End Verification & Walkthrough
- [ ] **Step 1: Test Image Forge to ensure no regressions**
- [ ] **Step 2: Test Video Studio with 5s and 30s duration generation**
- [ ] **Step 3: Document features and verification in walkthrough.md**
