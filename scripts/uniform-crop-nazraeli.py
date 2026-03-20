#!/usr/bin/env python3
"""
Uniform crop for Nazraeli One Picture Book covers.

All Nazraeli covers have the same format: 1200x1200px with uniform gray margins.
This script applies a standard crop to remove those margins.
"""

import sys
from pathlib import Path
from PIL import Image
import glob

# Standard crop for Nazraeli 1200x1200 format
# These values remove the gray background while preserving the book
# Dimensions based on manually-cropped Vol 07 (665x935 from 1200x1200)
CROP_LEFT = 267
CROP_TOP = 133
CROP_RIGHT = 933
CROP_BOTTOM = 1067

def uniform_crop_nazraeli(input_path, output_path=None):
    """Apply uniform crop to Nazraeli cover"""
    img = Image.open(input_path)
    width, height = img.size

    # Only process 1200x1200 images (standard Nazraeli format)
    if width != 1200 or height != 1200:
        print(f"Skip {Path(input_path).name}: {width}x{height} (not standard 1200x1200)")
        return False

    # Apply standard crop
    cropped = img.crop((CROP_LEFT, CROP_TOP, CROP_RIGHT, CROP_BOTTOM))

    if output_path is None:
        output_path = input_path

    cropped.save(output_path, quality=95, optimize=True)

    print(f"✓ {Path(input_path).name}: {width}x{height} → {CROP_RIGHT-CROP_LEFT}x{CROP_BOTTOM-CROP_TOP}")
    return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python uniform-crop-nazraeli.py 'pattern'")
        print("Example: python uniform-crop-nazraeli.py 'src/assets/images/books/*_NULL.jpg'")
        sys.exit(1)

    pattern = sys.argv[1]
    files = glob.glob(pattern)

    print(f"Processing {len(files)} files...")
    processed = 0

    for f in files:
        if uniform_crop_nazraeli(f):
            processed += 1

    print(f"\n✅ Processed {processed}/{len(files)} images")
