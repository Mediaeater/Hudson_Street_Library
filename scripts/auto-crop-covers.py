#!/usr/bin/env python3
"""
Auto-crop book cover images to remove background/trim.

Detects book edges by finding where uniform background ends,
then crops to just the book cover.

Usage:
    python scripts/auto-crop-covers.py --input image.jpg --output cropped.jpg
    python scripts/auto-crop-covers.py --batch "*.jpg" --suffix "_cropped"
    python scripts/auto-crop-covers.py --preview image.jpg  # Show before/after
"""

import argparse
import glob
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageChops
    import numpy as np
except ImportError:
    print("Error: Required packages not installed")
    print("Install with: pip install pillow numpy")
    sys.exit(1)


def detect_book_edges(img, threshold=30, edge_buffer=10):
    """
    Detect book edges using PIL's trim-based approach with background detection.

    Args:
        img: PIL Image
        threshold: Tolerance for background color variation
        edge_buffer: Minimum pixels from edge to consider

    Returns:
        (left, top, right, bottom) crop box
    """
    # Convert to RGB if necessary
    if img.mode != 'RGB':
        img = img.convert('RGB')

    # Get background color from corners (most likely to be background)
    bg_colors = [
        img.getpixel((0, 0)),
        img.getpixel((img.width-1, 0)),
        img.getpixel((0, img.height-1)),
        img.getpixel((img.width-1, img.height-1))
    ]

    # Use most common background color
    bg = max(set(bg_colors), key=bg_colors.count)

    # Create background image
    bg_img = Image.new('RGB', img.size, bg)

    # Calculate difference
    diff = ImageChops.difference(img, bg_img)

    # Convert difference to grayscale
    diff_gray = diff.convert('L')

    # Apply threshold
    bbox = diff_gray.getbbox()

    if not bbox:
        # No difference found, return original
        return (0, 0, img.width, img.height)

    left, top, right, bottom = bbox

    # Ensure we don't crop too aggressively - add generous margin to preserve book edges
    # Especially important for spine edges which can be similar color to background
    left = max(0, left - 15)  # More margin on left (spine area)
    top = max(0, top - 10)
    right = min(img.width, right + 10)
    bottom = min(img.height, bottom + 10)

    # Ensure valid crop box
    if right <= left or bottom <= top:
        return (0, 0, img.width, img.height)

    return (left, top, right, bottom)


def auto_crop_cover(input_path, output_path=None, threshold=30, show_preview=False):
    """
    Auto-crop a book cover image.

    Args:
        input_path: Path to input image
        output_path: Path to save cropped image (if None, shows preview only)
        threshold: Edge detection threshold
        show_preview: Show before/after comparison

    Returns:
        Cropped PIL Image
    """
    img = Image.open(input_path)
    original_size = img.size

    # Detect edges
    crop_box = detect_book_edges(img, threshold=threshold)

    # Crop image
    cropped = img.crop(crop_box)
    cropped_size = cropped.size

    # Calculate savings
    original_area = original_size[0] * original_size[1]
    cropped_area = cropped_size[0] * cropped_size[1]
    savings_pct = ((original_area - cropped_area) / original_area) * 100

    print(f"\n{Path(input_path).name}")
    print(f"  Original: {original_size[0]}x{original_size[1]}")
    print(f"  Cropped:  {cropped_size[0]}x{cropped_size[1]}")
    print(f"  Removed:  {savings_pct:.1f}% of image")
    print(f"  Crop box: {crop_box}")

    # Save if output path provided
    if output_path:
        cropped.save(output_path, quality=95, optimize=True)

        # Compare file sizes
        input_size = Path(input_path).stat().st_size
        output_size = Path(output_path).stat().st_size
        file_savings = ((input_size - output_size) / input_size) * 100 if output_size < input_size else 0

        print(f"  File size: {input_size/1024:.1f}KB → {output_size/1024:.1f}KB")
        if file_savings > 0:
            print(f"  Savings:   {file_savings:.1f}%")
        print(f"  Saved to:  {output_path}")

    if show_preview:
        # Create side-by-side comparison
        preview = Image.new('RGB', (original_size[0] + cropped_size[0] + 20, max(original_size[1], cropped_size[1])), 'white')
        preview.paste(img, (0, 0))
        preview.paste(cropped, (original_size[0] + 20, 0))

        # Draw labels
        draw = ImageDraw.Draw(preview)
        draw.text((10, 10), "Original", fill='red')
        draw.text((original_size[0] + 30, 10), "Cropped", fill='green')

        preview.show()

    return cropped


def batch_process(pattern, suffix="_cropped", threshold=30, overwrite=False):
    """
    Batch process multiple images.

    Args:
        pattern: Glob pattern for input files
        suffix: Suffix to add to output filenames
        threshold: Edge detection threshold
        overwrite: If True, overwrite original files
    """
    files = glob.glob(pattern)

    if not files:
        print(f"No files found matching: {pattern}")
        return

    print(f"Found {len(files)} images to process")

    for i, input_path in enumerate(files, 1):
        print(f"\n[{i}/{len(files)}]", end=" ")

        try:
            if overwrite:
                # Crop in place
                output_path = input_path
                # Save to temp first
                temp_path = str(Path(input_path).with_suffix('.tmp.jpg'))
                auto_crop_cover(input_path, temp_path, threshold=threshold)
                Path(temp_path).replace(input_path)
            else:
                # Save with suffix
                path = Path(input_path)
                output_path = path.parent / f"{path.stem}{suffix}{path.suffix}"
                auto_crop_cover(input_path, output_path, threshold=threshold)

        except Exception as e:
            print(f"  ERROR: {e}")


def main():
    parser = argparse.ArgumentParser(description='Auto-crop book cover images')
    parser.add_argument('--input', '-i', help='Input image file')
    parser.add_argument('--output', '-o', help='Output image file')
    parser.add_argument('--batch', '-b', help='Batch process (glob pattern)')
    parser.add_argument('--suffix', '-s', default='_cropped', help='Suffix for batch output')
    parser.add_argument('--threshold', '-t', type=int, default=30, help='Edge detection threshold')
    parser.add_argument('--preview', '-p', action='store_true', help='Show before/after preview')
    parser.add_argument('--overwrite', action='store_true', help='Overwrite original files (batch mode)')

    args = parser.parse_args()

    if args.batch:
        batch_process(args.batch, suffix=args.suffix, threshold=args.threshold, overwrite=args.overwrite)
    elif args.input:
        auto_crop_cover(args.input, args.output, threshold=args.threshold, show_preview=args.preview)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
