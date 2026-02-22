from PIL import Image
import os

input_path = r'd:\Antigravity\Bus_Lookup\modv2\bg.png'
output_path = r'd:\Antigravity\Bus_Lookup\modv2\bg_optimized.jpg'

print(f"Opening {input_path}...")
img = Image.open(input_path)
orig_w, orig_h = img.size
print(f"Original size: {orig_w}x{orig_h}")

# Target max dimension
MAX_DIM = 2000
if orig_w > MAX_DIM or orig_h > MAX_DIM:
    scale = MAX_DIM / max(orig_w, orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    print(f"Resizing to {new_w}x{new_h}...")
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
else:
    print("Image is within limits, just converting to JPG.")

# Convert to RGB (required for JPEG)
if img.mode in ("RGBA", "P"):
    img = img.convert("RGB")

print(f"Saving to {output_path}...")
img.save(output_path, "JPEG", quality=90, progressive=True, optimize=True)
print("Optimization complete.")
