# Library identity

Design work for the library as an institution, rather than for the website.
Marks, printed matter, production specs — anything a printer or a fabricator
would need to quote from.

```
identity/
└── stationery/     Foolscap Mk II — letterhead pad, continuation, compliment
                    slip, envelope, catalogue card, accession label, bookmark
```

Open `stationery/index.html` in a browser. It prints at true 1:1, so the sheets
on screen are the sheets on the press.

## This directory is not published

Eleventy's input is `src/`. Everything here sits outside it and is never built
or deployed — it is working material kept under version control, not a public
page. Don't move it into `src/` without deciding you want it on the live site.

## It shares the site's colour, deliberately

The seal is `#034706`, the same green the mark renders in on the website. There
is no separate print value. An earlier version of the stationery specified a
deeper green on the theory that a spot colour dries back lighter on uncoated
stock; that split is gone, and reintroducing one means the printed mark and the
screen mark stop being the same mark.

If the palette changes, `--seal` in `stationery/index.html` has to move with
`--primary-700` in `src/assets/css/design-system.css`. `npm run test:design`
guards the site side of that; this directory is outside its scope, so right now
the link is held by this paragraph rather than by a check.

> **TODO** — teach the palette check to scan `identity/` as well, so `--seal`
> can't quietly diverge. One-line change in `checkPalette()`. Tracked in
> [`plans/open-items/plan.md`](../plans/open-items/plan.md); worth doing next
> time these comps are edited.

Full specification, including the ramp and the rules for the mark:
[`src/design-system.md`](../src/design-system.md).
