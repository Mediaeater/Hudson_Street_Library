#!/usr/bin/env python3
"""Auto-crop a book cover product shot down to the object.

Publisher/retailer cover images are often a book photographed on a large plain
(white or grey) background. This trims that background with a background-
difference bounding box plus a little padding, so the cover fills the frame.

Used by the add-book skill:
    python3 scripts/auto-crop-covers.py --input src/assets/images/books/<file>.jpg --overwrite

The background colour is sampled from the four corners, so it works on white,
grey, or any uniform backdrop. If the object already fills the frame (nothing
meaningful to trim) it leaves the file untouched unless --force is given.
"""

import argparse
import sys

try:
    from PIL import Image, ImageChops
except ImportError:
    sys.stderr.write("error: Pillow (PIL) is required: pip3 install Pillow\n")
    sys.exit(2)


def autocrop(path, out_path, pad, threshold, quality, force):
    im = Image.open(path).convert("RGB")
    w, h = im.size

    # Background colour = average of the four corners.
    corners = [im.getpixel((1, 1)), im.getpixel((w - 2, 1)),
               im.getpixel((1, h - 2)), im.getpixel((w - 2, h - 2))]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    diff = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L")
    mask = diff.point(lambda p: 255 if p > threshold else 0)
    bbox = mask.getbbox()
    if not bbox:
        print(f"skip: {path} — no foreground detected (blank/low-contrast); left unchanged")
        return False

    pad_px = int(pad * max(w, h))
    left = max(0, bbox[0] - pad_px)
    top = max(0, bbox[1] - pad_px)
    right = min(w, bbox[2] + pad_px)
    bottom = min(h, bbox[3] + pad_px)

    # If the object already fills the frame there's nothing worth trimming;
    # avoid a needless recompress unless forced.
    crop_w, crop_h = right - left, bottom - top
    if not force and crop_w >= 0.99 * w and crop_h >= 0.99 * h:
        print(f"skip: {path} — already tight ({w}x{h}); use --force to crop anyway")
        return False

    cropped = im.crop((left, top, right, bottom))
    cropped.save(out_path, "JPEG", quality=quality)
    print(f"cropped: {path} {w}x{h} -> {cropped.size[0]}x{cropped.size[1]} "
          f"(bg={bg}, pad={pad_px}px) -> {out_path}")
    return True


def main():
    ap = argparse.ArgumentParser(description="Trim plain background from a book cover image.")
    ap.add_argument("--input", required=True, help="path to the cover image")
    ap.add_argument("--output", help="output path (default: alongside input as *_cropped.jpg)")
    ap.add_argument("--overwrite", action="store_true", help="write back over --input")
    ap.add_argument("--pad", type=float, default=0.035, help="padding as fraction of the larger side (default 0.035)")
    ap.add_argument("--threshold", type=int, default=22, help="background difference threshold 0-255 (default 22)")
    ap.add_argument("--quality", type=int, default=92, help="JPEG quality (default 92)")
    ap.add_argument("--force", action="store_true", help="crop even if the cover already fills the frame")
    args = ap.parse_args()

    if args.output:
        out = args.output
    elif args.overwrite:
        out = args.input
    else:
        base = args.input.rsplit(".", 1)
        out = base[0] + "_cropped." + (base[1] if len(base) > 1 else "jpg")

    try:
        autocrop(args.input, out, args.pad, args.threshold, args.quality, args.force)
    except FileNotFoundError:
        sys.stderr.write(f"error: file not found: {args.input}\n")
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001 - surface any imaging error clearly
        sys.stderr.write(f"error: {exc}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
