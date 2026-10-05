#!/usr/bin/env python3
"""Auto-crop a book cover product shot down to the object.

Publisher/retailer cover images are often a book photographed on a large plain
(white or grey) background. This trims that background with a background-
difference bounding box plus a little padding, so the cover fills the frame.

Used by the add-book skill:
    python3 scripts/auto-crop-covers.py --input src/assets/images/books/<file>.jpg --overwrite

The background colour is sampled from the four corners. The exit status says
whether the result can be trusted, so a caller never has to parse the output:

    0  cropped, and the result is a cover on clean white
    1  error (file missing, unreadable image)
    2  usage error, or Pillow not installed
    3  nothing cropped: no object found, or it already fills the frame.
       File unchanged. Right for a full-bleed scan, wrong for a product shot.
    4  refused, file unchanged: the corners disagree (no uniform backdrop), or
       the backdrop is not white. A crop here would keep a coloured margin, and
       on a dark full-bleed cover it cuts into the book. --force crops anyway.
    5  cropped and written, but not clean: a shadow or soft edge is still in
       the frame, or the backdrop was not white (--force). Crop it by hand.

Anything but 0 means: open the file and look.
"""

import argparse
import sys

try:
    from PIL import Image, ImageChops
except ImportError:
    sys.stderr.write("error: Pillow (PIL) is required: pip3 install Pillow\n")
    sys.exit(2)


EXIT_CLEAN = 0
EXIT_NOT_CROPPED = 3
EXIT_REFUSED = 4
EXIT_UNCLEAN = 5

WHITE_FLOOR = 235        # every channel of the backdrop must be at least this
WHITE_TINT = 12          # and the channels must sit this close together
CORNER_SPREAD = 18       # the four corners must agree this closely, per channel


def autocrop(path, out_path, pad, threshold, quality, force):
    """Crop one image. Returns one of the EXIT_* codes."""
    im = Image.open(path).convert("RGB")
    w, h = im.size

    # Background colour = average of the four corners.
    corners = [im.getpixel((1, 1)), im.getpixel((w - 2, 1)),
               im.getpixel((1, h - 2)), im.getpixel((w - 2, h - 2))]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    problems = []
    spread = max(max(c[i] for c in corners) - min(c[i] for c in corners) for i in range(3))
    if spread > CORNER_SPREAD:
        problems.append(f"the corners disagree (spread {spread}), so there is no uniform backdrop to trim")
    elif min(bg) < WHITE_FLOOR or max(bg) - min(bg) > WHITE_TINT:
        problems.append(f"the backdrop is not white (bg={bg})")
    if problems and not force:
        print(f"refused: {path}: {problems[0]}; left unchanged. "
              f"If this is a full-bleed cover it needs no crop; otherwise crop by hand or pass --force.")
        return EXIT_REFUSED

    diff = ImageChops.difference(im, Image.new("RGB", im.size, bg)).convert("L")
    mask = diff.point(lambda p: 255 if p > threshold else 0)
    bbox = mask.getbbox()
    if not bbox:
        print(f"skip: {path}: no foreground detected (blank/low-contrast); left unchanged")
        return EXIT_NOT_CROPPED

    pad_px = int(pad * max(w, h))
    left = max(0, bbox[0] - pad_px)
    top = max(0, bbox[1] - pad_px)
    right = min(w, bbox[2] + pad_px)
    bottom = min(h, bbox[3] + pad_px)

    # If the object already fills the frame there's nothing worth trimming;
    # avoid a needless recompress unless forced.
    crop_w, crop_h = right - left, bottom - top
    if not force and crop_w >= 0.99 * w and crop_h >= 0.99 * h:
        print(f"skip: {path}: already tight ({w}x{h}); left unchanged. use --force to crop anyway")
        return EXIT_NOT_CROPPED

    # A shadow is a band that differs from the backdrop a little, around an
    # object that differs a lot. Find the solid object with a stricter
    # threshold; where the loose box reaches well past it, the crop has kept
    # something soft (a drop shadow, a gradient, a grey card) in the frame.
    solid = diff.point(lambda p: 255 if p > max(64, threshold * 3) else 0).getbbox()
    if not solid:
        problems.append("the object is too close to the backdrop colour to find its edges")
    else:
        slack = {"left": solid[0] - bbox[0], "top": solid[1] - bbox[1],
                 "right": bbox[2] - solid[2], "bottom": bbox[3] - solid[3]}
        limit = {"left": w, "right": w, "top": h, "bottom": h}
        soft = [side for side, gap in slack.items() if gap > max(4, 0.015 * limit[side])]
        if soft:
            problems.append(f"a shadow or soft edge remains on the {', '.join(soft)}")

    cropped = im.crop((left, top, right, bottom))
    cropped.save(out_path, "JPEG", quality=quality)
    print(f"cropped: {path} {w}x{h} -> {cropped.size[0]}x{cropped.size[1]} "
          f"(bg={bg}, pad={pad_px}px) -> {out_path}")
    if problems:
        print(f"NOT CLEAN: {'; '.join(problems)}. The file was written; crop it by hand.")
        return EXIT_UNCLEAN
    return EXIT_CLEAN


def main():
    ap = argparse.ArgumentParser(description="Trim plain background from a book cover image.")
    ap.add_argument("--input", required=True, help="path to the cover image")
    ap.add_argument("--output", help="output path (default: alongside input as *_cropped.jpg)")
    ap.add_argument("--overwrite", action="store_true", help="write back over --input")
    ap.add_argument("--pad", type=float, default=0.035, help="padding as fraction of the larger side (default 0.035)")
    ap.add_argument("--threshold", type=int, default=22, help="background difference threshold 0-255 (default 22)")
    ap.add_argument("--quality", type=int, default=92, help="JPEG quality (default 92)")
    ap.add_argument("--force", action="store_true", help="crop even if the cover already fills the frame or the backdrop is not white")
    args = ap.parse_args()

    if args.output:
        out = args.output
    elif args.overwrite:
        out = args.input
    else:
        base = args.input.rsplit(".", 1)
        out = base[0] + "_cropped." + (base[1] if len(base) > 1 else "jpg")

    try:
        status = autocrop(args.input, out, args.pad, args.threshold, args.quality, args.force)
    except FileNotFoundError:
        sys.stderr.write(f"error: file not found: {args.input}\n")
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001 - surface any imaging error clearly
        sys.stderr.write(f"error: {exc}\n")
        sys.exit(1)
    sys.exit(status)


if __name__ == "__main__":
    main()
