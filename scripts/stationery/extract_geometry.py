#!/usr/bin/env python3
"""
Stage 1 of the stationery artwork pipeline: read the laid-out geometry of each
piece out of the browser, in millimetres.

The artwork is authored as CSS in src/identity/stationery/index.html and has been
approved as the browser renders it. Re-typing 350 lines of CSS into a PDF library
by hand would drift from the approved design in a hundred small ways, so instead
we let the browser do the layout it already does, then read every box, rule,
circle and line of type back out of the DOM in print media. Stage 2
(build_artwork.py) redraws exactly that, in two spot inks.

Everything is emitted in millimetres from the top-left of the piece's trim.

Run:  python extract_geometry.py <url> <out.json>
"""
import json, sys
from playwright.sync_api import sync_playwright

PX2MM = 25.4 / 96.0   # CSS defines an inch as 96px; print CSS pins --mm to 1mm

# Pieces, in the order section C numbers them. Each is (key, selector, label).
PIECES = [
    ("01-accession-pad",   ".sheet.f2",        "Accession pad"),
    ("02-compliment-slip", ".sheet.slip",      "Compliment slip"),
    ("03-envelope-face",   ".env.face",        "Envelope, face"),
    ("03-envelope-reverse",".env.back",        "Envelope, reverse"),
    ("04-catalogue-card",  ".sheet.catcard",   "Catalogue card"),
    ("05-accession-label", ".sheet.lab:not(.peel)", "Accession label"),
    ("06-bookmark-recto",  ".sheet.bm3:not(.verso)", "Bookmark, recto"),
    ("06-bookmark-verso",  ".sheet.bm3.verso", "Bookmark, verso"),
]

JS = r"""
(sel) => {
  const PX2MM = 25.4/96;
  const root = document.querySelector(sel);
  if (!root) return {error: "selector not found: " + sel};
  const rb = root.getBoundingClientRect();
  const mm = v => +(v * PX2MM).toFixed(4);
  const X  = v => mm(v - rb.left), Y = v => mm(v - rb.top);

  const out = {w: mm(rb.width), h: mm(rb.height),
               fills: [], rules: [], boxes: [], circles: [], seals: [], texts: [], rulings: [], notes: []};

  // rgb()/rgba() -> {ink:'black'|'green', tint:0..1} or null if invisible
  const parse = c => {
    const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null;
    const p = m[1].split(',').map(s => parseFloat(s));
    const [r,g,b] = p, a = p.length > 3 ? p[3] : 1;
    if (a === 0) return null;
    if (g > r + 20 && g > b + 20) return {ink:'green', tint:+a.toFixed(4), rgb:[r,g,b]};
    return {ink:'black', tint:+a.toFixed(4), rgb:[r,g,b]};
  };

  const SKIP = el => {
    const s = getComputedStyle(el);
    return s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0;
  };

  // ---- walk elements -------------------------------------------------------
  const walk = el => {
    if (SKIP(el)) return;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();

    // The mark is a parametric component (four bars, the fourth rotated 9deg);
    // its rotated child would report a bounding box larger than the bar, so it
    // is recorded by position and size and redrawn from its own geometry.
    if (el.matches('.seal')) {
      const col = parse(s.borderTopColor) || parse(s.backgroundColor);
      out.seals.push({x:X(r.left), y:Y(r.top), size:mm(r.width),
                      ink: col ? col.ink : 'green'});
      return;                                   // do not descend into the bars
    }
    // Vertical writing modes (the pad's marginal form reference, the bookmark
    // verso wordmark) set each glyph turned on its side. Per-glyph boxes would be
    // useless to a PDF, so the element is recorded once as a rotated run: the
    // sign of `turn` is the rotation the whole run needs, in degrees, clockwise.
    if (s.writingMode && s.writingMode.startsWith('vertical')) {
      const flipped = s.transform !== 'none' && s.transform.includes('-1');  // rotate(180deg)
      // The first glyph's own box gives the baseline directly (its cross-axis
      // extent is ascent+descent), so no half-leading arithmetic is needed.
      const tn0 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode();
      const rg = document.createRange(); rg.setStart(tn0, 0); rg.setEnd(tn0, 1);
      const c0 = rg.getBoundingClientRect();
      const vchars = [];
      for (let i = 0; i < tn0.nodeValue.length; i++) {
        rg.setStart(tn0, i); rg.setEnd(tn0, i + 1);
        const cr = rg.getBoundingClientRect();
        if (cr.width === 0 && cr.height === 0) continue;
        const ch = tn0.nodeValue[i];
        if (/\s/.test(ch) && vchars.length && /\s/.test(vchars[vchars.length-1][0])) continue;
        vchars.push([/\s/.test(ch) ? ' ' : ch, Y(cr.top), Y(cr.bottom)]);
      }
      out.texts.push({x:X(r.left), y:Y(r.top), w:mm(r.width), h:mm(r.height),
                      s: el.textContent.replace(/\s+/g,' ').trim(),
                      turn: flipped ? -90 : 90,
                      g0: {x:X(c0.left), y:Y(c0.top), w:mm(c0.width), h:mm(c0.height)},
                      chars: vchars,
                      font:s.fontFamily, size:mm(parseFloat(s.fontSize)),
                      weight:s.fontWeight, style:s.fontStyle,
                      transform:s.textTransform,
                      track: s.letterSpacing === 'normal' ? 0 : mm(parseFloat(s.letterSpacing)),
                      color: parse(s.color)});
      return;
    }
    // Ledger ruling is a repeating-linear-gradient; record it as a ruling spec
    // (period + weight + colour) rather than trying to read pixels back.
    if (s.backgroundImage && s.backgroundImage.includes('gradient')) {
      out.rulings.push({x:X(r.left), y:Y(r.top), w:mm(r.width), h:mm(r.height),
                        cls: el.className, raw: s.backgroundImage.slice(0, 400)});
    } else {
      const bg = parse(s.backgroundColor);
      if (bg) out.fills.push({x:X(r.left), y:Y(r.top), w:mm(r.width), h:mm(r.height),
                              color:bg, radius: mm(parseFloat(s.borderTopLeftRadius) || 0)});
    }

    // borders. A fully-bordered round element is a circle (tick marks, the card's
    // printed rod hole); anything else contributes one rule per visible side.
    const bw = ['Top','Right','Bottom','Left'].map(k => parseFloat(s['border'+k+'Width']) || 0);
    const bc = ['Top','Right','Bottom','Left'].map(k => parse(s['border'+k+'Color']));
    const bs = ['Top','Right','Bottom','Left'].map(k => s['border'+k+'Style']);
    const round = parseFloat(s.borderTopLeftRadius) >= r.width/2 - 0.5 && r.width > 0;
    if (round && bw[0] > 0 && bc[0]) {
      out.circles.push({cx:X(r.left + r.width/2), cy:Y(r.top + r.height/2),
                        d:mm(r.width), weight:mm(bw[0]), color:bc[0]});
    } else if (bw.every(w => w > 0) && bc.every(c => c) && new Set(bs).size === 1 &&
               new Set(bw).size === 1 && new Set(bc.map(c => c.ink + c.tint)).size === 1) {
      // All four sides identical: one stroked rectangle, so the corners mitre the
      // way the browser draws them instead of leaving butt-cap notches.
      const w0 = bw[0];
      out.boxes.push({x:X(r.left + w0/2), y:Y(r.top + w0/2),
                      w:mm(r.width - w0), h:mm(r.height - w0),
                      weight:mm(w0), color:bc[0], style:bs[0],
                      radius: mm(parseFloat(s.borderTopLeftRadius) || 0)});
    } else {
      const sides = [['top',0],['right',1],['bottom',2],['left',3]];
      for (const [name,i] of sides) {
        if (!(bw[i] > 0 && bc[i] && bs[i] !== 'none')) continue;
        let x0,y0,x1,y1;
        if (name === 'top')    { x0=r.left; x1=r.right;  y0=y1=r.top + bw[i]/2; }
        if (name === 'bottom') { x0=r.left; x1=r.right;  y0=y1=r.bottom - bw[i]/2; }
        if (name === 'left')   { y0=r.top;  y1=r.bottom; x0=x1=r.left + bw[i]/2; }
        if (name === 'right')  { y0=r.top;  y1=r.bottom; x0=x1=r.right - bw[i]/2; }
        out.rules.push({x0:X(x0), y0:Y(y0), x1:X(x1), y1:Y(y1),
                        weight:mm(bw[i]), color:bc[i], style:bs[i],
                        radius: mm(parseFloat(s.borderTopLeftRadius) || 0)});
      }
    }
    for (const c of el.children) walk(c);
  };
  walk(root);

  // ---- walk text, one record per rendered LINE ------------------------------
  // Character rects are grouped by baseline row, which gives the exact left edge
  // of each line (so centring and letter-spacing come out of the browser rather
  // than being recomputed) and splits wrapped text at the browser's break points.
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const txt = n.nodeValue;
    if (!txt.trim()) continue;
    const pe = n.parentElement;
    if (SKIP(pe) || pe.closest('.seal')) continue;
    if (getComputedStyle(pe).writingMode.startsWith('vertical')) continue;
    const s = getComputedStyle(pe);
    const collapses = !s.whiteSpace.startsWith('pre');
    const rng = document.createRange();
    let lines = [];
    for (let i = 0; i < txt.length; i++) {
      rng.setStart(n, i); rng.setEnd(n, i + 1);
      const cr = rng.getBoundingClientRect();
      if (cr.width === 0 && cr.height === 0) continue;
      // A run of whitespace collapses to one rendered space under white-space:
      // normal, so only the first of a run is kept (source indentation and line
      // breaks inside the markup would otherwise be measured as real characters).
      const ch = /\s/.test(txt[i]) ? ' ' : txt[i];
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - cr.top) < 0.6) {
        const prev = last.chars[last.chars.length - 1][0];
        if (!(ch === ' ' && prev === ' ' && collapses)) {
          last.chars.push([ch, cr.left]); last.right = cr.right;
        }
      } else {
        lines.push({chars: [[ch, cr.left]], left: cr.left, right: cr.right,
                    top: cr.top, bottom: cr.bottom});
      }
    }
    for (const L of lines) {
      while (L.chars.length && L.chars[L.chars.length-1][0] === ' ') L.chars.pop();
      const str = L.chars.map(c => c[0]).join('');
      if (!str.trim()) continue;
      out.texts.push({x:X(L.left), y:Y(L.top), h:mm(L.bottom - L.top),
                      w:mm(L.right - L.left), s:str,
                      chars: L.chars.map(c => [c[0], X(c[1])]),
                      font:s.fontFamily, size:mm(parseFloat(s.fontSize)),
                      weight:s.fontWeight, style:s.fontStyle,
                      transform:s.textTransform,
                      track: s.letterSpacing === 'normal' ? 0 : mm(parseFloat(s.letterSpacing)),
                      color: parse(s.color)});
    }
  }
  // ---- baseline offsets, measured rather than derived -----------------------
  // The distance from the top of a text run's box down to its baseline depends on
  // how the engine rounds the font's ascent, which is not worth reverse-
  // engineering. An empty zero-height inline-block sits exactly on the baseline,
  // so one off-screen probe per type style gives the offset directly.
  const styles = new Map();
  for (const t of out.texts) {
    const key = [t.font, t.size, t.weight, t.style].join('|');
    if (!styles.has(key)) styles.set(key, t);
  }
  const probeBox = document.createElement('div');
  probeBox.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;line-height:normal';
  document.body.appendChild(probeBox);
  out.baselines = {};
  for (const [key, t] of styles) {
    const sp = document.createElement('span');
    sp.style.cssText = `font-family:${t.font};font-size:${t.size/PX2MM}px;` +
                       `font-weight:${t.weight};font-style:${t.style};line-height:normal`;
    const tn = document.createTextNode('Hxg');
    const pr = document.createElement('span');
    pr.style.cssText = 'display:inline-block;width:0;height:0';
    sp.appendChild(tn); sp.appendChild(pr); probeBox.appendChild(sp);
    const rng = document.createRange(); rng.selectNodeContents(tn);
    const tr = rng.getBoundingClientRect(), pb = pr.getBoundingClientRect();
    out.baselines[key] = {ascent: mm(pb.top - tr.top), height: mm(tr.height)};
    probeBox.removeChild(sp);
  }
  document.body.removeChild(probeBox);
  return out;
}
"""

def main():
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8899/identity/stationery/"
    out = sys.argv[2] if len(sys.argv) > 2 else "geometry.json"
    doc = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1600, "height": 1200})
        pg.goto(url, wait_until="networkidle")
        pg.emulate_media(media="print")
        pg.wait_for_timeout(400)
        for key, sel, label in PIECES:
            g = pg.evaluate(JS, sel)
            if g.get("error"):
                print(f"  !! {key}: {g['error']}"); continue
            g["label"] = label; g["selector"] = sel
            doc[key] = g
            print(f"  {key:22} {g['w']:7.2f} x {g['h']:7.2f} mm   "
                  f"{len(g['texts']):4} text  {len(g['rules']):3} rules  "
                  f"{len(g['fills']):3} fills  {len(g['boxes'])} box  {len(g['circles']):3} circles  "
                  f"{len(g['seals'])} seal  {len(g['rulings'])} ruling")
        b.close()
    json.dump(doc, open(out, "w"), indent=1)
    print(f"\nwrote {out}")

if __name__ == "__main__":
    main()
