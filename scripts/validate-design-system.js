#!/usr/bin/env node
/**
 * validate-design-system.js
 *
 * Guards the three invariants that kept silently breaking, each one found only
 * after it had already shipped. All three are checked at SOURCE level, because
 * the checks that missed them were rendered-state checks: they sampled a page
 * at one viewport with no interaction, so :hover / :focus rules and anything
 * behind a media query were structurally invisible to them.
 *
 *   1. palette   — one green. No off-palette green/teal anywhere in src/.
 *   2. coverage  — every built page loads tailwind.css, or is allowlisted.
 *                  A rule added to the Tailwind build's @layer base silently
 *                  does not apply to a page that never loads the sheet.
 *   3. header    — one header definition. No page hand-rolls the wordmark.
 *
 * Usage:
 *   node scripts/validate-design-system.js              # all checks
 *   node scripts/validate-design-system.js --source     # skip the _site check
 *
 * Exits non-zero on any violation, with file:line and a fix hint.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SITE = path.join(ROOT, '_site');

/* ------------------------------------------------------------------ *
 * The palette. This list is the single source of truth for the colour
 * check; design-system.css and input.css must both draw from it.
 * ------------------------------------------------------------------ */
const BRAND = {
  '#81b182': 'primary-400',
  '#508950': 'primary-500',
  '#276628': 'primary-600',
  '#034706': 'primary-700 — the mark',
  '#003100': 'forest-800 (hover/darker)',
  '#002000': 'forest-900',
};

// Greens that are deliberately NOT the brand: status and alert semantics,
// plus a few near-white tints used as backgrounds.
const SEMANTIC = {
  '#22c55e': 'token --success',
  '#15803d': 'badge-success text',
  '#dcfce7': 'badge-success bg',
  '#f0fdf4': 'alert-success bg',
  '#bbf7d0': 'alert-success border',
  '#d1fae5': 'status-available bg',
  '#065f46': 'status-available text',
  '#f0f5f0': 'header hover tint',
  '#e8f2f5': 'collection-explore tint',
  '#d6e5e8': 'collection-explore tint',
};

const ALLOWED = new Set([...Object.keys(BRAND), ...Object.keys(SEMANTIC)]);

// Pages that legitimately do not load tailwind.css. Adding to this list should
// be a conscious act: anything here is invisible to every @layer base rule.
const NO_TAILWIND_OK = new Set([
  'browse-gallery-demo/index.html',
  'design-system/index.html',
  'discover.html',
  'collections/queering-the-collection.html',
  'books/collections/queer/Louis-Fratino-Satura/index.html',
  'books/collections/queer/Paul_Thek-Peter_Hujar-Stay_Away_From_Nothing/index.html',
  'books/collections/queer/Vince_Aletti-Physique/index.html',
  // Standalone print comp with its own styles, passthrough-copied verbatim.
  'identity/stationery/index.html',
]);

const HEADER_COMPONENT = '_includes/components/site-header.njk';

const EXT = new Set(['.css', '.html', '.njk', '.js']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

// Green/teal hue band, with enough saturation to actually read as a colour.
// Greys and near-blacks fall out on the saturation test.
const isGreenish = (hex) => {
  const { h, s } = hexToHsl(hex);
  return h >= 90 && h <= 200 && s > 0.12;
};

// Only look inside CSS declarations. Matching bare hex anywhere in the file
// picks up prose like "Useful Photography #010" as the colour #001100.
const DECL = /(color|background|background-color|border|border-[a-z-]+|outline|fill|stroke|box-shadow|--[a-z0-9-]+)\s*:\s*([^;{}]*)/gi;
const HEX6 = /#[0-9a-fA-F]{6}\b/g;
const RGBFN = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;

const toHex = (r, g, b) =>
  '#' + [r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('');

// Walks all of src/, which since Aug 2026 includes src/identity/ (stationery
// comps, brand-guide artboards, published at /identity/). When identity/
// lived outside src/ it drifted unnoticed — the catalogue card's rule set in
// #134E4A, a third ink on a two-ink print job — so the identity sources stay
// inside the walked tree.
function checkPalette() {
  const violations = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(ROOT, file);
    // The token definitions are where the palette is allowed to be spelled out.
    const isTokenFile =
      rel.endsWith('assets/css/design-system.css') || rel.endsWith('assets/css/input.css');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      let m;
      DECL.lastIndex = 0;
      while ((m = DECL.exec(line))) {
        const value = m[2];
        const candidates = [];
        let h;
        HEX6.lastIndex = 0;
        while ((h = HEX6.exec(value))) candidates.push(h[0].toLowerCase());
        let c;
        RGBFN.lastIndex = 0;
        while ((c = RGBFN.exec(value))) candidates.push(toHex(c[1], c[2], c[3]));
        for (const hex of candidates) {
          if (!isGreenish(hex) || ALLOWED.has(hex)) continue;
          if (isTokenFile && Object.keys(BRAND).includes(hex)) continue;
          violations.push({ file: rel, line: i + 1, hex, snippet: line.trim().slice(0, 88) });
        }
      }
    });
  }
  return violations;
}

function checkTailwindCoverage() {
  if (!fs.existsSync(SITE)) return null; // nothing built; caller reports skip
  const missing = [];
  const stack = [SITE];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith('.html')) {
        const rel = path.relative(SITE, full);
        if (NO_TAILWIND_OK.has(rel)) continue;
        if (!fs.readFileSync(full, 'utf8').includes('assets/css/tailwind.css')) {
          missing.push(rel);
        }
      }
    }
  }
  return missing;
}

function checkSingleHeader() {
  const offenders = [];
  for (const file of walk(SRC)) {
    const rel = path.relative(ROOT, file);
    if (rel.endsWith(HEADER_COMPONENT)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('HUDSON STREET LIBRARY</a>')) offenders.push(rel);
  }
  return offenders;
}

/* ------------------------------------------------------------------ */

const sourceOnly = process.argv.includes('--source');
let failed = false;

console.log('🎨 Validating design system invariants...\n');

// 1 — palette
const paletteViolations = checkPalette();
if (paletteViolations.length) {
  failed = true;
  console.error(`❌ palette: ${paletteViolations.length} off-palette green/teal value(s)\n`);
  for (const v of paletteViolations) {
    console.error(`   ${v.file}:${v.line}  ${v.hex}`);
    console.error(`      ${v.snippet}`);
  }
  console.error('\n   The library green is one ramp. Use a token, not a raw hex:');
  for (const [hex, name] of Object.entries(BRAND)) console.error(`      ${hex}  ${name}`);
  console.error('   If the colour is deliberately non-brand (a status or alert),');
  console.error('   add it to SEMANTIC in this script with a reason.\n');
} else {
  console.log('✅ palette: no off-palette green/teal in src/');
}

// 2 — tailwind coverage
if (sourceOnly) {
  console.log('⏭️  coverage: skipped (--source)');
} else {
  const missing = checkTailwindCoverage();
  if (missing === null) {
    console.log('⏭️  coverage: skipped (_site not built)');
  } else if (missing.length) {
    failed = true;
    console.error(`\n❌ coverage: ${missing.length} built page(s) do not load tailwind.css`);
    console.error('   Any rule in the Tailwind build\'s @layer base is inert on these:\n');
    for (const p of missing.slice(0, 25)) console.error(`   ${p}`);
    if (missing.length > 25) console.error(`   ... and ${missing.length - 25} more`);
    console.error('\n   Either link the sheet, or add the page to NO_TAILWIND_OK');
    console.error('   in this script — knowingly, since base rules will not reach it.\n');
  } else {
    console.log('✅ coverage: every built page loads tailwind.css (or is allowlisted)');
  }
}

// 3 — single header
const headerOffenders = checkSingleHeader();
if (headerOffenders.length) {
  failed = true;
  console.error(`\n❌ header: ${headerOffenders.length} page(s) hand-roll the site header\n`);
  for (const p of headerOffenders.slice(0, 25)) console.error(`   ${p}`);
  if (headerOffenders.length > 25) console.error(`   ... and ${headerOffenders.length - 25} more`);
  console.error('\n   A duplicated header drifts: these pages froze at an older nav.');
  console.error('   Replace the markup with:');
  console.error('      {% include "components/site-header.njk" %}\n');
} else {
  console.log('✅ header: one definition, used everywhere');
}

if (failed) {
  console.error('\n💥 Design system validation FAILED\n');
  process.exit(1);
}
console.log('\n✨ Design system validation passed\n');
