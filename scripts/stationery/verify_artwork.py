#!/usr/bin/env python3
"""
Stage 4 of the stationery artwork pipeline: prove the generated files are what
Section C of /identity/stationery/ promises, and that they still look like the
approved design.

Two independent checks, because each catches what the other cannot:

  structure  Reads the PDF objects. Trim size, output intent, XMP identification,
             every font embedded, no Type 1 or Type 3, and — the point of the
             whole exercise — no device colour anywhere: every mark must be laid
             down in a named Separation.

  raster     Renders the generated artwork and the browser's own print-media
             rendering of each piece at the same scale, and compares ink coverage. This
             is the check that catches a rule drawn in the wrong place, which no
             amount of object inspection would notice.

The raster comparison is deliberately a coverage comparison, not a pixel diff:
the browser paints in RGB and the artwork in a spot alternate, and the two
rasterisers antialias differently, so identical geometry never gives identical
pixels. Ink/no-ink masks, dilated by the tolerance, do compare meaningfully.

Run:  python verify_artwork.py --dist dist --reference reference/ [--render]
"""
import argparse, io, os, re, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_artwork import DELIVERABLES, TRIM, MARGIN, MM   # one source of truth for trim

# One reference image per face, <key>.png, taken from the element that
# extract_geometry.PIECES names for that key. compare() refuses an image whose size
# is not the face's trim, so a selector that lands on the wrong piece cannot pass.
REFERENCE_ORDER = [
    "01-accession-pad",
    "02-compliment-slip",
    "03-envelope-face",
    "03-envelope-reverse",
    "04-catalogue-card",
    "05-accession-label",
    "06-bookmark-recto",
    "06-bookmark-verso",
]

DPI = 609.6          # exactly 24 px/mm, so a 10 mm margin crops on a pixel boundary
PXMM = DPI / 25.4
INK = 250            # a pixel darker than this in any channel counts as ink
# The browser is not a fine-grained record of the layout: it snaps borders and
# glyph origins to whole CSS pixels, so its own output is quantised to
# 1/96 in = 0.265 mm. The artwork is drawn in exact millimetres, which is better,
# but it means the two can only be compared to the coarser of the two grids.
TOL_MM = 0.27        # one CSS pixel: the browser's own positional quantum


# ------------------------------------------------------------------ structure --
def tokens(stream):
    """Operator tokens of a content stream, with string and hex-string bodies skipped."""
    i, n, out = 0, len(stream), []
    while i < n:
        c = stream[i:i + 1]
        if c == b"(":                                   # literal string
            depth, i = 1, i + 1
            while i < n and depth:
                if stream[i:i + 1] == b"\\": i += 2; continue
                if stream[i:i + 1] == b"(": depth += 1
                elif stream[i:i + 1] == b")": depth -= 1
                i += 1
        elif c == b"<" and stream[i + 1:i + 2] != b"<":  # hex string
            i = stream.find(b">", i) + 1 or n
        elif c == b"%":                                  # comment
            i = stream.find(b"\n", i) + 1 or n
        elif c.isalpha() or c in b"'\"":
            j = i
            while j < n and (stream[j:j + 1].isalpha() or stream[j:j + 1] in b"*01'\""):
                j += 1
            out.append(stream[i:j]); i = j
        else:
            i += 1
    return out


DEVICE_OPS = {b"rg", b"RG", b"g", b"G", b"k", b"K"}


def structure(pdf, path, pieces, condition):
    import pikepdf
    bad = []
    say = lambda m: bad.append(f"{os.path.basename(path)}: {m}")

    if pdf.pdf_version < "1.6":
        say(f"PDF version {pdf.pdf_version}, expected 1.6")

    for i, (page, (w, h)) in enumerate(zip(pdf.pages, pieces), 1):
        want = [MARGIN * MM, MARGIN * MM, (MARGIN + w) * MM, (MARGIN + h) * MM]
        if "/TrimBox" not in page:
            say(f"page {i}: no TrimBox")
        elif max(abs(float(a) - b) for a, b in zip(page.TrimBox, want)) > 0.01:
            say(f"page {i}: TrimBox {[round(float(v), 2) for v in page.TrimBox]} != {[round(v, 2) for v in want]}")
        if "/BleedBox" in page:
            say(f"page {i}: has a BleedBox; the job is specified with no bleed")

        res = page.get("/Resources", pikepdf.Dictionary())
        for name, font in dict(res.get("/Font", {})).items():
            sub = str(font.get("/Subtype"))
            if sub == "/Type0":
                font = font.DescendantFonts[0]
            desc = font.get("/FontDescriptor")
            if sub in ("/Type1", "/MMType1"):
                say(f"page {i}: {name} is {sub} ({font.get('/BaseFont')})")
            elif sub == "/Type3":
                say(f"page {i}: {name} is a Type 3 font — cannot be separated downstream")
            elif desc is None or not any(k in desc for k in ("/FontFile", "/FontFile2", "/FontFile3")):
                say(f"page {i}: {name} ({font.get('/BaseFont')}) is not embedded")

        if "/XObject" in res:
            say(f"page {i}: has XObjects; the artwork is meant to be vector only")

        for name, cs in dict(res.get("/ColorSpace", {})).items():
            fam = str(cs[0]) if isinstance(cs, pikepdf.Array) else str(cs)
            if fam not in ("/Separation", "/DeviceN"):
                say(f"page {i}: colorspace {name} is {fam}, not a separation")

        body = page.Contents
        data = (b"".join(c.read_bytes() for c in body) if isinstance(body, pikepdf.Array)
                else body.read_bytes())
        used = set(tokens(data)) & DEVICE_OPS
        if used:
            say(f"page {i}: device colour operators {sorted(t.decode() for t in used)}")

    intents = pdf.Root.get("/OutputIntents")
    if not intents:
        say("no OutputIntent — the file cannot claim PDF/X")
    else:
        oi = intents[0]
        if str(oi.get("/S")) != "/GTS_PDFX":
            say(f"OutputIntent subtype {oi.get('/S')}, expected /GTS_PDFX")
        if str(oi.get("/OutputConditionIdentifier")) != condition:
            say(f"output condition {oi.get('/OutputConditionIdentifier')!s}, expected {condition}")
        prof = oi.get("/DestOutputProfile")
        if prof is None:
            say("OutputIntent has no embedded DestOutputProfile")
        elif int(prof.get("/N", 0)) != 4:
            say(f"DestOutputProfile N={prof.get('/N')}, expected 4 (CMYK)")

    with pdf.open_metadata(set_pikepdf_as_editor=False, update_docinfo=False) as meta:
        if meta.get("pdfxid:GTS_PDFXVersion") != "PDF/X-4":
            say(f"XMP GTS_PDFXVersion {meta.get('pdfxid:GTS_PDFXVersion')!r}, expected 'PDF/X-4'")
        if meta.get("pdf:Trapped") != "False":
            say(f"XMP Trapped {meta.get('pdf:Trapped')!r}, expected 'False'")
    if str(pdf.docinfo.get("/Trapped")) != "/False":
        say(f"docinfo Trapped {pdf.docinfo.get('/Trapped')!s}, expected /False")
    return bad


def separations(pdf):
    """Every named colorant the file lays ink down in."""
    names = set()
    for page in pdf.pages:
        for cs in dict(page.get("/Resources", {}).get("/ColorSpace", {})).values():
            if str(cs[0]) == "/Separation":
                names.add(str(cs[1]))
    return sorted(names)


# --------------------------------------------------------------------- raster --
def render(pdf, out_prefix, first=None, last=None):
    cmd = ["pdftoppm", "-r", str(DPI), "-png"]
    if first: cmd += ["-f", str(first), "-l", str(last or first)]
    subprocess.run(cmd + [pdf, out_prefix], check=True)
    d, base = os.path.dirname(out_prefix), os.path.basename(out_prefix)
    return sorted(os.path.join(d, f) for f in os.listdir(d)
                  if f.startswith(base + "-") and f.endswith(".png"))


def mask(im):
    """Ink / no-ink, as an L image of 0 or 255. Darkest channel wins, so a solid
    green counts as ink exactly as much as a solid black does."""
    from PIL import ImageChops
    r, g, b = im.convert("RGB").split()
    return ImageChops.darker(ImageChops.darker(r, g), b).point(
        lambda p: 255 if p < INK else 0)


def compare(gen_png, ref_png, w, h, outdir, label):
    """Coverage comparison of one face, both cropped to trim."""
    from PIL import Image, ImageChops, ImageFilter
    W, H = round(w * PXMM), round(h * PXMM)
    m = round(MARGIN * PXMM)

    gen = Image.open(gen_png).crop((m, m, m + W, m + H))
    ref = Image.open(ref_png)
    # The screenshot is a whole number of device pixels, so its edge can land a
    # pixel off nominal trim. Rescaling it onto the nominal grid keeps that from
    # reading as a geometry error.
    if abs(ref.width - W) > 8 or abs(ref.height - H) > 8:
        return None, f"{label}: reference image is {ref.width}x{ref.height} px, expected {W}x{H}"
    if (ref.width, ref.height) != (W, H):
        ref = ref.resize((W, H), Image.LANCZOS)

    a, b = mask(gen), mask(ref)
    k = 2 * round(TOL_MM * PXMM) + 1                      # odd kernel, ±TOL_MM
    a_wide = a.filter(ImageFilter.MaxFilter(k))
    b_wide = b.filter(ImageFilter.MaxFilter(k))
    only_gen = ImageChops.subtract(a, b_wide)
    only_ref = ImageChops.subtract(b, a_wide)

    n = lambda im: im.histogram()[255]
    ink_a, ink_b, og, orf = n(a), n(b), n(only_gen), n(only_ref)
    union = max(ink_a, ink_b, 1)

    over = Image.new("RGB", a.size, (255, 255, 255))
    over.paste((200, 200, 200), (0, 0), a)                 # our ink, for context
    over.paste((210, 0, 0), (0, 0), only_gen)              # ours with nothing near it
    over.paste((0, 60, 210), (0, 0), only_ref)             # browser ink we did not draw
    over.save(os.path.join(outdir, f"diff-{label}.png"))

    return dict(label=label, ink_gen=ink_a, ink_ref=ink_b,
                only_gen=og, only_ref=orf,
                pct_gen=100.0 * og / union, pct_ref=100.0 * orf / union), None


# ----------------------------------------------------------------------- main --
def render_reference(url, outdir):
    """One PNG per face: the browser's print-media rendering of that element, at the
    comparison scale. Not the browser's print PDF. Chrome 157 rasterises a CSS
    gradient into the PDF at 72 px/in, which drops every third line of the ledger
    ruling, so the PDF is no longer a fair picture of the design. The screen
    rasteriser draws the same print layout at any scale asked of it."""
    from chrome import Page
    from extract_geometry import PIECES
    os.makedirs(outdir, exist_ok=True)
    with Page(url, viewport=(1600, 1200)) as pg:
        pg.print_media()
        for key, sel, _ in PIECES:
            with open(os.path.join(outdir, key + ".png"), "wb") as f:
                f.write(pg.screenshot(sel, scale=DPI / 96.0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist", default="dist")
    ap.add_argument("--reference", default="reference",
                    help="folder of the browser's own renderings, for the raster comparison")
    ap.add_argument("--render", action="store_true", help="re-render the reference first")
    ap.add_argument("--url", default="http://localhost:8899/identity/stationery/")
    ap.add_argument("--condition", default="CGATS21_CRPC2")
    ap.add_argument("--out", default="verify", help="where the diff images are written")
    a = ap.parse_args()

    import pikepdf
    os.makedirs(a.out, exist_ok=True)
    if a.render or not os.path.exists(a.reference):
        print(f"rendering reference from {a.url}")
        render_reference(a.url, a.reference)

    failures, rows = [], []

    print("\nstructure")
    for key, title, pieces in DELIVERABLES:
        path = os.path.join(a.dist, key + ".pdf")
        with pikepdf.open(path) as pdf:
            bad = structure(pdf, path, [TRIM[p] for p in pieces], a.condition)
            seps = separations(pdf)
        failures += bad
        print(f"  {key:22} {len(pieces)} page(s)  inks {seps}"
              + ("" if not bad else f"  {len(bad)} FAIL"))
        for m in bad:
            print(f"      ! {m}")
        extra = [s for s in seps if s not in ("/All", "/Black", "/HSL#20Green", "/HSL Green")]
        if extra:
            failures.append(f"{key}: unexpected colorant(s) {extra}")

    missing = [k for k in REFERENCE_ORDER
               if not os.path.exists(os.path.join(a.reference, k + ".png"))]
    if missing:
        sys.exit(f"reference is missing {missing}; run with --render")

    print("\nraster  (coverage against the browser's own print-media rendering,"
          f" {TOL_MM} mm tolerance)")
    with tempfile.TemporaryDirectory() as tmp:
        print(f"  {'face':22}{'ink px':>10}{'only ours':>11}{'only browser':>14}   verdict")
        for key, title, pieces in DELIVERABLES:
            gen_pages = render(os.path.join(a.dist, key + ".pdf"),
                               os.path.join(tmp, "gen-" + key))
            for pk, gp in zip(pieces, gen_pages):
                w, h = TRIM[pk]
                st, err = compare(gp, os.path.join(a.reference, pk + ".png"), w, h, a.out, pk)
                if err:
                    failures.append(err); print(f"  {pk:22} ! {err}"); continue
                worst = max(st["pct_gen"], st["pct_ref"])
                verdict = "ok" if worst < 2.0 else ("check" if worst < 6.0 else "FAIL")
                if verdict == "FAIL":
                    failures.append(f"{pk}: coverage differs by {worst:.1f}% of inked area")
                rows.append(st)
                print(f"  {pk:22}{st['ink_gen']:10,}{st['pct_gen']:10.2f}%"
                      f"{st['pct_ref']:13.2f}%   {verdict}")

    print(f"\ndiff images in {a.out}/  (red = ours only, blue = browser only)")
    if failures:
        print(f"\n{len(failures)} FAILURE(S)")
        for f in failures:
            print(f"  ! {f}")
        sys.exit(1)
    print("\nall checks passed")


if __name__ == "__main__":
    main()
