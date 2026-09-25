import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))

from video_engine import fetch_resilient_base_image, strip_watermark

def test_watermark_removal():
    test_img = Image.new("RGB", (768, 768), color=(100, 100, 100))
    cleaned = strip_watermark(test_img)
    assert cleaned.size == (768, 768), f"Expected (768, 768) but got {cleaned.size}"
    print("[PASS] Watermark removal dimensions test passed!")

def test_flux_generation():
    prompt = "a handsome boy with umbrella in heavy rain, realistic"
    print("Testing FLUX generation...")
    img = fetch_resilient_base_image(prompt, 512, 512, model="flux")
    assert img is not None
    assert img.size == (512, 512), f"Expected (512, 512) but got {img.size}"
    print("[PASS] FLUX generation test passed! Size:", img.size)

if __name__ == "__main__":
    test_watermark_removal()
    test_flux_generation()
