import os
import sys
from dotenv import load_dotenv
from huggingface_hub import InferenceClient
from PIL import Image

load_dotenv()
token = os.getenv("HF_TOKEN")
if not token:
    print("ERROR: HF_TOKEN not found in .env")
    sys.exit(1)

from video_engine import (
    generate_cinematic_motion_fallback,
    extend_frames_to_duration,
    encode_frames_to_mp4_bytes,
    process_video_generation,
    ASPECT_RATIOS,
)
import numpy as np

print("--- Testing Unit Functions ---")
# 1. Test aspect ratios
assert "16:9" in ASPECT_RATIOS
assert "9:16" in ASPECT_RATIOS
assert "1:1" in ASPECT_RATIOS
print("Aspect ratios verified.")

# 2. Test extend_frames_to_duration
dummy_frames = [np.zeros((64, 64, 3), dtype=np.uint8) for _ in range(24)] # 1 sec @ 24fps
extended_10s = extend_frames_to_duration(dummy_frames, target_duration_sec=10, fps=24)
assert len(extended_10s) == 240, f"Expected 240 frames for 10s, got {len(extended_10s)}"
print("Frame extension to 10s verified: 240 frames.")

extended_30s = extend_frames_to_duration(dummy_frames, target_duration_sec=30, fps=24)
assert len(extended_30s) == 720, f"Expected 720 frames for 30s, got {len(extended_30s)}"
print("Frame extension to 30s verified: 720 frames.")

# 3. Test encode_frames_to_mp4_bytes
mp4_bytes = encode_frames_to_mp4_bytes(extended_10s[:24], fps=24)
assert len(mp4_bytes) > 500, f"MP4 bytes too small: {len(mp4_bytes)}"
print(f"MP4 encoding verified: {len(mp4_bytes)} bytes.")

# 4. Test generate_cinematic_motion_fallback
test_img = Image.new("RGB", (512, 512), color=(120, 50, 200))
cinematic_mp4 = generate_cinematic_motion_fallback(test_img, target_duration=5, aspect_ratio="16:9", fps=24)
assert len(cinematic_mp4) > 1000
print(f"Cinematic motion engine verified: {len(cinematic_mp4)} bytes.")

print("All standalone tests PASSED successfully!")
