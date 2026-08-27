# Stationery artwork

Generates the six print-ready files that Section C of `/identity/stationery/` promises,
from the page itself.

```sh
npm run build && npx http-server _site -p 8899 -s &
scripts/stationery/build.sh
```

Output: `dist/stationery/*.pdf` — six PDF/X-4 files, two named spot channels, trim marks,
no bleed — which the publish stage then copies into `src/assets/stationery/`, with a zip
of all six and a manifest at `src/_data/stationery.json`. Those three are tracked: the
printer is sent a link to `/identity/stationery/`, where the specification and the files
it describes are published together and cannot drift apart. `dist/` and `build/` stay
gitignored; commit whatever the publish stage changes.

| file | pages | trim |
|---|---|---|
| `01-accession-pad.pdf` | 1 | 203 × 330 mm |
| `02-compliment-slip.pdf` | 1 | 203 × 110 mm |
| `03-envelope-dl.pdf` | 2 (face, reverse) | 220 × 110 mm |
| `04-catalogue-card.pdf` | 1 | 125 × 75 mm |
| `05-accession-label.pdf` | 1 | 60 × 32 mm |
| `06-bookmark.pdf` | 2 (recto, verso) | 55 × 210 mm |

Each is about 2.7 MB, of which all but a few kB is the embedded output-intent profile.

## Rebuilding does not churn the repo

These are committed binaries, so a rebuild must produce the same bytes when the design
has not moved. Three things make that true: reportlab runs with `invariant=1`, pikepdf
saves with `deterministic_id=True`, and the date stamped into the files comes from
`ARTWORK_DATE` in `build_artwork.py` rather than the clock. The zip is written with fixed
entry dates for the same reason.

`ARTWORK_DATE` is bumped by hand when the design changes. That is deliberate — dating from
git would oscillate, because committing the PDFs changes the commit date they were dated
from, which changes the PDFs. The publish stage prints a warning if the artwork moved and
the date did not.

## Why it is built this way

`src/identity/stationery/index.html` is the design. There is no Illustrator file behind
it — every piece is CSS, and the approved artwork is what a browser makes of that CSS.
Re-typing 350 lines of CSS into a PDF library by hand would drift from the approved
design in a hundred small ways that nobody would catch.

So the browser does the layout it already does, and the pipeline reads its output back:

1. **`extract_geometry.py`** walks each piece's DOM in print media and emits every box,
   rule, circle, gradient and line of type in millimetres from the top-left of trim.
2. **`prepare_fonts.py`** pins the variable font masters to the exact instances the
   browser rendered.
3. **`build_artwork.py`** redraws that geometry in two spot inks with reportlab, then
   finalises it as PDF/X-4 with pikepdf.
4. **`verify_artwork.py`** checks the objects, then compares the result to the browser's
   own print output as a raster.

The page stays the single source of truth. Change the CSS, re-run `build.sh`.

## Four things that were not obvious

**Optical size.** Literata is loaded as a variable font and the page uses
`font-optical-sizing: auto`, so at 2.4 mm the browser draws a materially different
design from the static Regular that Google serves by default — measured, the static ran
5 % narrow over a line, and the error flipped sign with size. Stage 2 instantiates the
`opsz` axis at the rendered pixel size, which is what the browser does.

**Kerning.** Chromium kerns; reportlab's `stringWidth` does not, which is a 6–33 µm
positive bias per character. Stage 1 records the x position of every character, and
stage 3 resets the pen whenever it has drifted more than 0.010 mm from it.

**Baselines are measured, not derived.** Chromium rounds font ascent and descent to
whole device pixels, and the rounding cannot be reproduced from the font metrics —
`round(asc) + round(desc)` and `round(asc + desc)` disagree, and the browser uses
neither consistently. Stage 1 measures the baseline directly with a zero-height
`display:inline-block` probe, which aligns its bottom margin edge to the baseline.

**Chromium's own print PDF is quantised.** Its content stream is written in whole CSS
pixels (verified: every rect in it is integer-valued under a 0.75 scale CTM), so the
browser's print output rounds every position and every rule to 1/96 in = 0.265 mm. The
generated artwork is drawn in exact millimetres and is the better of the two. Two
consequences: the raster comparison can only be made to the coarser grid, 0.27 mm; and
rule weights are taken from the design (`--hair: calc(.25 * var(--mm))` = 0.25 mm)
rather than from Chromium's rounding of them to 1 px. The ledger rulings are drawn as
gradients, which Chromium does not round, and they measure exactly 0.25 mm — which is
what confirms the intent.

## What `verify_artwork.py` checks

*Structure* — PDF 1.6; a TrimBox on every page at the specified size and no BleedBox;
every font embedded, none Type 1 or Type 3; no image XObjects; every colorspace a
Separation; **no device colour operator anywhere in any content stream**; an embedded
4-channel output intent; `pdfxid:GTS_PDFXVersion`, `pdf:Trapped` and the docinfo
`/Trapped`. Colorants must be exactly `Black`, `HSL Green` and `All` (registration, used
only for the trim marks).

*Raster* — both the artwork and the browser's print output rendered at 24 px/mm, cropped
to trim, compared as ink-coverage masks dilated by the tolerance. This is a coverage
comparison rather than a pixel diff on purpose: the browser paints in RGB and the artwork
in a spot alternate, and the two rasterisers antialias differently, so identical geometry
never gives identical pixels. Diff images are written to `build/stationery/verify/`
(grey = our ink, red = ours with no browser ink near it, blue = browser ink we did not draw).

Three residual differences are expected and are the browser's, not the artwork's:

- **04 catalogue card, 2.4 %** and **01 pad, 0.4 %** — Chromium draws the ledger ruling as
  a tiling pattern anchored in pattern space rather than to the element, so its phase
  lands up to a pixel off and it exposes a sliver of the previous period at the top of the
  ruled box. CSS puts no rule there and neither do we.
- **03 envelope face, 0.5 %** — the dashed POSTAGE box. Chromium fits a whole number of
  dashes to each side; the artwork does the same, but the two fits differ on one edge.

## Colour

Two spot channels, `Black` and `HSL Green`. Tints are set as the separation's density, so
a 20 % rule is 20 % of one ink, not a build. Nothing is ever laid down in device colour —
that is asserted at the operator level, not just by inspecting the colorspaces.

The green's alternate space is computed, not guessed: `#034706` is converted through the
embedded output intent with Little CMS (relative colorimetric), giving
C 66.7 M 0.4 Y 100 K 79.2 under CRPC2. It is only the alternate — what a viewer shows and
what a composite proof prints. The plate is the spot channel.

**Output intent: `CGATS21_CRPC2.icc`**, the CGATS 21 uncoated characterisation, which is
the stock the job is specified on. It is fetched at build time from color.org rather than
vendored. Its own `cprt` tag is the reason it was chosen over the alternatives: *"Copyright
X-Rite, Inc. This profile is made available by IDEAlliance, with permission of X-Rite, Inc.,
and may be used, embedded, exchanged, included in commercial software and shared without
restriction."* Apple's Generic CMYK profile is proprietary, and Ghostscript's
`iccprofiles/default_cmyk.icc` is covered by the AGPL that ghostpdl ships.

## What this does not do

- **It is not a preflight.** The structural checks are the PDF/X-4 requirements that could
  be tested here; they are not a substitute for running the files through Acrobat or
  pdfToolbox, which is the printer's job and should still happen.
- **The spot colour has no Pantone number.** By design — Section C asks for a drawdown match
  on the running stock. The channel is named `HSL Green` and the printer picks the ink.
- **No trapping.** Section C states the two colours never meet, so `/Trapped` is `False` and
  the artwork carries no spread or choke. If that ever stops being true, this needs revisiting.
- **It does not regenerate on deploy.** GitHub Actions builds the site, not the artwork —
  that needs a browser, the font masters and the ICC profile. The published files are
  whatever was last committed, so rebuild and commit after changing the design.
- **`05-accession-label.pdf` is one label, not the imposed sheet.** Section C specifies 21 up
  on an A4 liner, 3 × 7; stepping and the kiss-cut die are the printer's origination.
