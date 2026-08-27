#!/usr/bin/env python3
"""
Stage 2 of the stationery artwork pipeline: fetch the variable font masters and
pin them to the exact instances the browser rendered.

The site loads Literata as a variable font with an optical-size axis, so at 2.4 mm
the browser is drawing a materially different design from the static "Regular"
Google serves by default — measured, the static ran 5 % narrow over a full line.
Pinning opsz to the rendered pixel size (what font-optical-sizing:auto does)
closes that to a fraction of a percent. Weight axes are pinned the same way.

Reads the styles actually used out of geometry.json, so it only ever builds the
instances the artwork needs.

Run:  python prepare_fonts.py <geometry.json> <build-dir>
"""
import json, os, sys, urllib.request

GF = "https://raw.githubusercontent.com/google/fonts/main/ofl"
# family -> (google-fonts path, upright master, italic master). None = not variable.
MASTERS = {
    "Literata":       ("literata", "Literata[opsz,wght].ttf", "Literata-Italic[opsz,wght].ttf"),
    "Crimson Pro":    ("crimsonpro", "CrimsonPro[wght].ttf", "CrimsonPro-Italic[wght].ttf"),
    "Archivo Narrow": ("archivonarrow", "ArchivoNarrow[wght].ttf", "ArchivoNarrow-Italic[wght].ttf"),
    "IBM Plex Mono":  ("ibmplexmono", "IBMPlexMono-Regular.ttf", "IBMPlexMono-Italic.ttf"),
}
PX_PER_MM = 96.0 / 25.4


def slug(family, weight, style, size_mm, has_opsz):
    """Stable instance name. Optical size is part of the identity when the axis exists."""
    base = f"{family.replace(' ', '')}-{style}-{weight}"
    return f"{base}-opsz{opsz_for(size_mm):.3f}" if has_opsz else base


def opsz_for(size_mm):
    return max(7.0, min(72.0, size_mm * PX_PER_MM))


def rename(font, name):
    """
    Give the instance its own identity. fontTools can only derive instance names
    from STAT axis values, and an optical size pinned to a rendered pixel size has
    none, so the family / subfamily / full / PostScript records are set directly.
    """
    ps = name.replace(" ", "")
    for rec in font["name"].names:
        if rec.nameID in (1, 3, 4, 6, 16, 17):
            font["name"].setName(ps if rec.nameID in (6, 3) else name,
                                 rec.nameID, rec.platformID, rec.platEncID, rec.langID)


def fetch(rel, dest):
    if os.path.exists(dest):
        return dest
    url = f"{GF}/{rel}".replace("[", "%5B").replace("]", "%5D")
    print(f"  fetching {os.path.basename(dest)}")
    with urllib.request.urlopen(url) as r, open(dest, "wb") as f:
        f.write(r.read())
    return dest


def main():
    geom = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "geometry.json"))
    build = sys.argv[2] if len(sys.argv) > 2 else "build"
    masters, inst = os.path.join(build, "masters"), os.path.join(build, "fonts")
    os.makedirs(masters, exist_ok=True); os.makedirs(inst, exist_ok=True)

    styles = set()
    for piece in geom.values():
        for t in piece["texts"]:
            styles.add((t["font"].split(",")[0].strip("'\""), t["weight"], t["style"], t["size"]))

    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer

    index = {}
    for family, weight, style, size in sorted(styles):
        if family not in MASTERS:
            sys.exit(f"no master registered for {family!r}")
        path, upright, italic = MASTERS[family]
        src = fetch(f"{path}/{italic if style == 'italic' else upright}",
                    os.path.join(masters, italic if style == "italic" else upright))
        font = TTFont(src)
        axes = {a.axisTag for a in font["fvar"].axes} if "fvar" in font else set()
        name = slug(family, weight, style, size, "opsz" in axes)
        out = os.path.join(inst, name + ".ttf")
        index[f"{family}|{weight}|{style}|{size}"] = name
        if os.path.exists(out):
            continue
        if axes:
            loc = {}
            if "wght" in axes: loc["wght"] = float(weight)
            if "opsz" in axes: loc["opsz"] = opsz_for(size)
            instancer.instantiateVariableFont(font, loc, inplace=True, updateFontNames=False)
            rename(font, name)   # so two weights of one family cannot collide in the PDF
            font.save(out)
            print(f"  {name:44} {loc}")
        else:
            font.save(out)          # already static (IBM Plex Mono ships no axes)
            print(f"  {name:44} static")
    json.dump(index, open(os.path.join(inst, "index.json"), "w"), indent=1)
    print(f"\n{len(set(index.values()))} instances in {inst}")


if __name__ == "__main__":
    main()
