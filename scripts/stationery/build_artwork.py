#!/usr/bin/env python3
"""
Stage 3 of the stationery artwork pipeline: draw the extracted geometry as press
artwork — six PDFs, two named spot channels, no process colour anywhere.

What this fixes, relative to printing the page from a browser: the browser gives
one 8-page DeviceRGB file with Type 3 fonts, no separations, no output intent and
no trim marks. Section C of /identity/stationery/ promises the opposite of all
four, and a Type 3 document cannot be remapped to a spot channel after the fact,
so the artwork has to be drawn rather than converted.

Every mark is /Separation /Black or /Separation /HSL Green. Trim marks are drawn
in /All so they appear on both plates. Tints are the declared 60/50/30/20 ladder
and nothing else.

Run:  python build_artwork.py --geometry geometry.json --build build --out dist/stationery
"""
import argparse, json, os, re, sys, datetime

from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import CMYKColorSep

MM = 72.0 / 25.4          # PostScript points per millimetre

# The date stamped into the files. PDF/X wants one, and it should say when the
# artwork was drawn rather than when this script last ran: the files are committed
# and served, so a wall-clock date would rewrite six 2.7 MB binaries on every build.
# Bump it when the design changes — publish.py complains if the artwork moves and
# this does not.
ARTWORK_DATE = "2026-08-27T00:00:00-04:00"


def style_key(t):
    """(family, size, weight, style) — how type styles are identified throughout."""
    return (t["font"].split(",")[0].strip("'\""), float(t["size"]), t["weight"], t["style"])
MARK_OFFSET = 5.0         # mm from the trim to where a trim mark starts
MARK_LEN = 5.0            # mm of drawn mark
MARGIN = MARK_OFFSET + MARK_LEN
HAIR = 0.25               # mm — the one rule weight in the system
CSS_PX = 25.4 / 96        # what Chromium rounds every border width to


def authored(weight):
    """
    The weight the design asks for, not the one the browser reports.

    Chromium rounds every border to a whole CSS pixel before computed style will
    give it back, so the page's one hairline — --hair: calc(.25 * var(--mm)) —
    returns as 0.2646 mm however it is authored. The ledger rulings are drawn as
    gradients, which are not rounded, and they measure exactly 0.25 mm: the same
    variable, unrounded, which is what confirms the intent. A supplied master
    should carry the drawn weight, not the screen's rounding of it.
    """
    return HAIR if abs(weight - CSS_PX) < 1e-3 else weight

# The green is specified as a spot to be matched to a drawdown, so the CMYK here
# is only the alternate space: what a RIP falls back to if the plate is flattened.
# It is measured from the brand green through the output-intent profile rather
# than guessed, so the fallback lands in gamut on the stated printing condition.
BRAND_GREEN_RGB = (0x03, 0x47, 0x06)

# The trim is a specification, not a measurement: the box is written at the size
# section C states, and the extracted geometry is checked against it.
TRIM = {
    "01-accession-pad":    (203, 330),
    "02-compliment-slip":  (203, 110),
    "03-envelope-face":    (220, 110),
    "03-envelope-reverse": (220, 110),
    "04-catalogue-card":   (125, 75),
    "05-accession-label":  (60, 32),
    "06-bookmark-recto":   (55, 210),
    "06-bookmark-verso":   (55, 210),
}

# Six deliverables. Two of them print both sides, which is why there are eight
# extracted pieces but six files.
DELIVERABLES = [
    ("01-accession-pad",   "Accession pad, 203 x 330 mm",   ["01-accession-pad"]),
    ("02-compliment-slip", "Compliment slip, 203 x 110 mm", ["02-compliment-slip"]),
    ("03-envelope-dl",     "DL banker envelope, 220 x 110 mm, face and reverse",
     ["03-envelope-face", "03-envelope-reverse"]),
    ("04-catalogue-card",  "Catalogue card, 125 x 75 mm",   ["04-catalogue-card"]),
    ("05-accession-label", "Accession label, 60 x 32 mm",   ["05-accession-label"]),
    ("06-bookmark",        "Bookmark, 55 x 210 mm, recto and verso",
     ["06-bookmark-recto", "06-bookmark-verso"]),
]


# ---------------------------------------------------------------- inks --------
def green_alternate(icc_path):
    """sRGB brand green -> CMYK in the output-intent condition, via Little CMS."""
    try:
        from PIL import Image, ImageCms
        src = ImageCms.createProfile("sRGB")
        dst = ImageCms.getOpenProfile(icc_path)
        tf = ImageCms.buildTransform(src, dst, "RGB", "CMYK",
                                     renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC)
        px = ImageCms.applyTransform(Image.new("RGB", (1, 1), BRAND_GREEN_RGB), tf).getpixel((0, 0))
        return tuple(v / 255.0 for v in px)
    except Exception as exc:                       # no profile, or no lcms build
        print(f"  ! green alternate falls back to a nominal value ({exc})")
        return (0.90, 0.30, 1.00, 0.40)


class Inks:
    def __init__(self, green_cmyk):
        self.green_cmyk = green_cmyk

    def of(self, ink, tint=1.0):
        if ink == "green":
            c, m, y, k = self.green_cmyk
            return CMYKColorSep(c, m, y, k, spotName="HSL Green", density=tint)
        return CMYKColorSep(0, 0, 0, 1, spotName="Black", density=tint)

    @staticmethod
    def registration():
        return CMYKColorSep(1, 1, 1, 1, spotName="All", density=1)


# --------------------------------------------------------------- fonts --------
def load_fonts(build):
    d = os.path.join(build, "fonts")
    index = json.load(open(os.path.join(d, "index.json")))
    for name in sorted(set(index.values())):
        pdfmetrics.registerFont(TTFont(name, os.path.join(d, name + ".ttf")))
    return index


# --------------------------------------------------------------- sheet --------
class Sheet:
    """
    One printed side. Drawing is done in the CSS convention — millimetres from the
    top-left of the trim — and mapped to PDF's bottom-left origin here, once.
    """

    def __init__(self, canvas, inks, w, h, fonts):
        self.c, self.inks, self.W, self.H, self.fonts = canvas, inks, w, h, fonts

    def x(self, v): return (MARGIN + v) * MM
    def y(self, v): return (MARGIN + self.H - v) * MM

    def _stroke(self, color, weight, style="solid", run=None):
        self.c.setStrokeColor(self.inks.of(color["ink"], color["tint"]))
        self.c.setLineWidth(max(authored(weight), HAIR) * MM)
        self.c.setLineCap(0)
        if style == "dashed" and run:
            # Chromium fits a whole number of dashes to the run and starts and ends
            # on one; reproduce that rather than letting the pattern fall anywhere.
            on, off = 0.80, 0.55
            n = max(1, round((run + off) / (on + off)))
            k = run / (n * on + (n - 1) * off)
            self.c.setDash([on * k * MM, off * k * MM], 0)
        else:
            self.c.setDash()

    # -- primitives -------------------------------------------------------------
    def rule(self, r):
        run = abs(r["x1"] - r["x0"]) or abs(r["y1"] - r["y0"])
        self._stroke(r["color"], r["weight"], r.get("style", "solid"), run)
        self.c.line(self.x(r["x0"]), self.y(r["y0"]), self.x(r["x1"]), self.y(r["y1"]))

    def box(self, b):
        self._stroke(b["color"], b["weight"], b.get("style", "solid"), b["w"])
        self.c.rect(self.x(b["x"]), self.y(b["y"] + b["h"]), b["w"] * MM, b["h"] * MM,
                    stroke=1, fill=0)

    def fill(self, f):
        self.c.setFillColor(self.inks.of(f["color"]["ink"], f["color"]["tint"]))
        self.c.rect(self.x(f["x"]), self.y(f["y"] + f["h"]), f["w"] * MM, f["h"] * MM,
                    stroke=0, fill=1)

    def circle(self, ci):
        self._stroke(ci["color"], ci["weight"])
        w = authored(ci["weight"])
        self.c.circle(self.x(ci["cx"]), self.y(ci["cy"]),
                      (ci["d"] - w) / 2 * MM, stroke=1, fill=0)

    def ruling(self, ru):
        """A repeating-linear-gradient ledger, redrawn as the rules it depicts."""
        stops = [(m.group(1), float(m.group(2)))
                 for m in re.finditer(r"(rgba?\([^)]*\))\s+([\d.]+)px", ru["raw"])]
        if len(stops) < 4:
            print(f"  ! unparsed ruling on {ru['cls']}"); return
        px2mm = 25.4 / 96
        period = stops[-1][1] * px2mm
        band0, band1 = stops[1][1] * px2mm, stops[3][1] * px2mm
        alpha = re.findall(r"[\d.]+", stops[2][0])
        color = {"ink": "black", "tint": float(alpha[3]) if len(alpha) > 3 else 1.0}
        thick = band1 - band0
        self.c.setFillColor(self.inks.of(color["ink"], color["tint"]))
        k = 0
        while True:
            top = k * period + band0
            if top >= ru["h"] - 1e-6:
                break
            # The box almost never holds a whole number of periods — the pad's last
            # rule overruns it by a micrometre — so each rule is filled as a box
            # clipped to the ruled area, the way the browser clips the gradient,
            # rather than stroked whole and dropped when it will not fit.
            bot = min(top + thick, ru["h"])
            self.c.rect(self.x(ru["x"]), self.y(ru["y"] + bot),
                        ru["w"] * MM, (bot - top) * MM, stroke=0, fill=1)
            k += 1

    # -- the mark ---------------------------------------------------------------
    def seal(self, s):
        """
        Four spines in a ruled box, the fourth leaning 9 degrees — the same
        construction as the favicon, drawn from its proportions rather than traced.
        Sanctioned at 15 / 10 / 7 mm only; below 7 the leaning spine closes up.
        """
        S, x0, y0 = s["size"], s["x"], s["y"]
        ink = self.inks.of(s["ink"])
        bw = 0.058 * S
        self.c.setStrokeColor(ink); self.c.setLineWidth(bw * MM); self.c.setDash()
        self.c.setLineJoin(0)
        self.c.rect(self.x(x0 + bw / 2), self.y(y0 + S - bw / 2),
                    (S - bw) * MM, (S - bw) * MM, stroke=1, fill=0)

        self.c.setFillColor(ink)
        heights = (0.36, 0.43, 0.395, 0.41)
        bar_w, gap = 0.10 * S, 0.05 * S
        group_w, group_h = 4 * bar_w + 3 * gap, max(heights) * S
        left = x0 + bw + ((S - 2 * bw) - group_w) / 2
        base = y0 + bw + ((S - 2 * bw) - group_h) / 2 + group_h      # bottoms align
        for i, frac in enumerate(heights):
            bx, bh = left + i * (bar_w + gap), frac * S
            if i < 3:
                self.c.rect(self.x(bx), self.y(base), bar_w * MM, bh * MM, stroke=0, fill=1)
            else:
                self.c.saveState()
                self.c.translate(self.x(bx), self.y(base))    # rotate about bottom-left
                self.c.rotate(-9)                             # CSS rotate(9deg) is clockwise
                self.c.rect(0, 0, bar_w * MM, bh * MM, stroke=0, fill=1)
                self.c.restoreState()

    # -- type -------------------------------------------------------------------
    def font_for(self, t):
        fam = t["font"].split(",")[0].strip("'\"")
        key = f"{fam}|{t['weight']}|{t['style']}|{t['size']}"
        if key not in self.fonts:
            sys.exit(f"no instance prepared for {key}")
        return self.fonts[key]

    def text(self, t):
        font, size = self.font_for(t), t["size"]
        self.c.setFillColor(self.inks.of(t["color"]["ink"], t["color"]["tint"]))
        self.c.setFont(font, size * MM)
        if "turn" in t:
            self._vertical(t, font, size)
        else:
            self._horizontal(t, font, size)

    def _runs(self, t, font, size, tol=0.010):
        """
        Split a line where the drawn pen drifts from the browser's own character
        positions by more than `tol` mm. The browser kerns and reportlab does not,
        so a long line would otherwise creep by up to 0.7 mm; this inherits the
        rendered letterfit at a cost of about one extra move per line.
        """
        up = t.get("transform") == "uppercase"
        runs, start, buf, pen = [], t["chars"][0][1], "", t["chars"][0][1]
        for ch, pos in t["chars"]:
            if buf and abs(pen - pos) > tol:
                runs.append((start, buf)); start, pen, buf = pos, pos, ""
            g = ch.upper() if up else ch
            buf += g
            pen += pdfmetrics.stringWidth(g, font, size) + t["track"]
        if buf:
            runs.append((start, buf))
        return runs

    def _horizontal(self, t, font, size):
        base = t["y"] + self.ascent(t)
        for x0, run in self._runs(t, font, size):
            self.c.drawString(self.x(x0), self.y(base), run, charSpace=t["track"] * MM)

    def _vertical(self, t, font, size):
        """
        A run set on its side. `turn` is the rotation the whole run needs,
        clockwise on the page: +90 for writing-mode:vertical-rl, -90 when that is
        flipped 180 so the line reads upward. After the rotation the text axis is
        the local x axis, and a glyph's position along it is just its millimetre
        coordinate down the piece.
        """
        g0, asc = t["g0"], self.ascent(t)
        up, down = t.get("transform") == "uppercase", t["turn"] > 0
        baseline = g0["x"] + g0["w"] - asc if down else g0["x"] + asc
        sign = 1 if down else -1
        self.c.saveState()
        self.c.translate(self.x(baseline), self.y(0))
        self.c.rotate(-90 if down else 90)
        pen = None
        for ch, top, bottom in t["chars"]:
            g = ch.upper() if up else ch
            want = sign * (top if down else bottom) * MM
            if pen is None or abs(pen - want) > 0.010 * MM:
                pen = want
            self.c.drawString(pen, 0, g, charSpace=t["track"] * MM)
            pen += (pdfmetrics.stringWidth(g, font, size) + t["track"]) * MM
        self.c.restoreState()

    def ascent(self, t):
        return self.baselines[style_key(t)]["ascent"]

    # -- marks ------------------------------------------------------------------
    def trim_marks(self):
        self.c.setStrokeColor(Inks.registration())
        self.c.setLineWidth(HAIR * MM); self.c.setDash(); self.c.setLineCap(0)
        o, L = MARK_OFFSET, MARK_LEN
        for cx in (0, self.W):
            sx = -1 if cx == 0 else 1
            for cy in (0, self.H):
                sy = -1 if cy == 0 else 1
                self.c.line(self.x(cx + sx * o), self.y(cy),
                            self.x(cx + sx * (o + L)), self.y(cy))
                self.c.line(self.x(cx), self.y(cy + sy * o),
                            self.x(cx), self.y(cy + sy * (o + L)))

    # -- the page ---------------------------------------------------------------
    def draw(self, g):
        self.baselines = {}
        for k, v in g["baselines"].items():
            font, size, weight, st = k.rsplit("|", 3)
            self.baselines[(font.split(",")[0].strip("'\""), float(size), weight, st)] = v
        for r in g["rulings"]: self.ruling(r)
        for f in g["fills"]:   self.fill(f)
        for b in g["boxes"]:   self.box(b)
        for r in g["rules"]:   self.rule(r)
        for c in g["circles"]: self.circle(c)
        for s in g["seals"]:   self.seal(s)
        for t in g["texts"]:   self.text(t)
        self.trim_marks()


# ----------------------------------------------------------------- main --------
def build(key, title, pieces, geom, inks, fonts, out_dir, icc, condition, date):
    path = os.path.join(out_dir, key + ".pdf")
    w0, h0 = TRIM[pieces[0]]
    size = ((w0 + 2 * MARGIN) * MM, (h0 + 2 * MARGIN) * MM)
    # reportlab opens every page with "BT /F1 12 Tf 14.4 TL ET" against its built-in
    # Helvetica, which PDF/X forbids because it is not embedded. Naming an embedded
    # TrueType face as the initial font drops the operator entirely — subsetted fonts
    # are written at the point of use — so no unembedded font is ever referenced.
    c = Canvas(path, pagesize=size, pdfVersion=(1, 6), enforceColorSpace="sep",
               # invariant: fixed document ID and no wall-clock date, so two builds
               # of an unchanged page are byte-identical. These files are committed and
               # served from the site, and a 2.7 MB binary that churns on every run
               # would put a fresh copy in git history each time.
               pageCompression=1, invariant=1,
               initialFontName=sorted(set(fonts.values()))[0])
    c.setTitle(f"Hudson Street Library — {title}")
    c.setAuthor("Hudson Street Library")
    c.setSubject("Two spot colours: Black, HSL Green. No process colour. No bleed.")
    c.setCreator("Hudson Street Library stationery artwork generator")
    for i, pk in enumerate(pieces):
        g, (w, h) = geom[pk], TRIM[pk]
        if abs(g["w"] - w) > 0.05 or abs(g["h"] - h) > 0.05:
            sys.exit(f"{pk} lays out at {g['w']} x {g['h']} mm, not the specified {w} x {h}")
        c.setPageSize(((w + 2 * MARGIN) * MM, (h + 2 * MARGIN) * MM))
        Sheet(c, inks, w, h, fonts).draw(g)
        c.showPage()
    c.save()
    finalise(path, title, [TRIM[p] for p in pieces], icc, condition, date)
    return path


def finalise(path, title, pieces, icc, condition, date):
    """Stamp PDF/X-4 identification: output intent, XMP, Trapped, dates."""
    import pikepdf
    now = date
    with pikepdf.open(path, allow_overwriting_input=True) as pdf:
        # reportlab stores setTrimBox but never writes it to the page, and PDF/X
        # requires one on every page, so it is set here against the trim size.
        used = b""
        for page, (w, h) in zip(pdf.pages, pieces):
            page.TrimBox = pikepdf.Array([MARGIN * MM, MARGIN * MM,
                                          (MARGIN + w) * MM, (MARGIN + h) * MM])
            body = page.Contents
            used += (b"".join(c.read_bytes() for c in body) if isinstance(body, pikepdf.Array)
                     else body.read_bytes())
        # Belt and braces against an unembedded font surviving into a PDF/X file.
        # The union of all pages is what counts: reportlab hands every page the same
        # /Font dictionary, so a name dropped for one page is dropped for all of them.
        for page in pdf.pages:
            res_fonts = page.get("/Resources", {}).get("/Font", {})
            for name in [str(k) for k in res_fonts.keys()]:
                if name.encode() + b" " not in used:
                    del res_fonts[name]
        if icc:
            with open(icc, "rb") as f:
                blob = f.read()
            stream = pdf.make_stream(blob)
            stream.N = 4
            pdf.Root.OutputIntents = pikepdf.Array([pdf.make_indirect(pikepdf.Dictionary(
                Type=pikepdf.Name.OutputIntent, S=pikepdf.Name("/GTS_PDFX"),
                OutputConditionIdentifier=pikepdf.String(condition),
                OutputCondition=pikepdf.String(condition),
                RegistryName=pikepdf.String("http://www.color.org"),
                Info=pikepdf.String(condition),
                DestOutputProfile=pdf.make_indirect(stream)))])
        with pdf.open_metadata(set_pikepdf_as_editor=False, update_docinfo=True) as meta:
            meta["dc:title"] = f"Hudson Street Library — {title}"
            meta["dc:creator"] = ["Hudson Street Library"]
            meta["pdf:Producer"] = "Hudson Street Library stationery artwork generator"
            meta["xmp:CreatorTool"] = "Hudson Street Library stationery artwork generator"
            meta["xmp:CreateDate"] = now
            meta["xmp:ModifyDate"] = now
            meta["pdf:Trapped"] = "False"
            if icc:
                meta.register_xml_namespace("http://www.npes.org/pdfx/ns/id/", "pdfxid")
                meta["pdfxid:GTS_PDFXVersion"] = "PDF/X-4"
        pdf.docinfo["/Trapped"] = pikepdf.Name("/False")
        # deterministic_id: pikepdf otherwise writes a fresh random second half of
        # /ID on every save, which alone would make each rebuild a new 2.7 MB blob.
        pdf.save(path, linearize=False, deterministic_id=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--geometry", default="geometry.json")
    ap.add_argument("--build", default="build")
    ap.add_argument("--out", default="dist/stationery")
    ap.add_argument("--icc", default=None,
                    help="CMYK output-intent profile to embed; omit to skip the PDF/X-4 claim")
    ap.add_argument("--condition", default="CGATS21_CRPC2",
                    help="OutputConditionIdentifier for the embedded profile")
    ap.add_argument("--date", default=ARTWORK_DATE,
                    help=f"ISO 8601 date to stamp (default {ARTWORK_DATE})")
    a = ap.parse_args()

    geom = json.load(open(a.geometry))
    fonts = load_fonts(a.build)
    inks = Inks(green_alternate(a.icc) if a.icc else (0.90, 0.30, 1.00, 0.40))
    os.makedirs(a.out, exist_ok=True)
    if not a.icc:
        print("  ! no --icc: files are plain PDF 1.6, not stamped PDF/X-4")
    print(f"  green alternate CMYK {tuple(round(v, 3) for v in inks.green_cmyk)}")
    for key, title, pieces in DELIVERABLES:
        p = build(key, title, pieces, geom, inks, fonts, a.out, a.icc, a.condition, a.date)
        print(f"  {os.path.basename(p):26} {len(pieces)} page(s)  {os.path.getsize(p)/1024:8.0f} kB")


if __name__ == "__main__":
    main()
