# research-asst — Researching without WebSearch

`WebSearch` is capped at **200 calls per session** (about 100 rows of book research).
`WebFetch`, `curl` and public JSON APIs are **not capped**. So when search runs out,
research is not over.

> **Search buys discovery** — learning which host holds the record. Once you know the
> host, go straight at it.

Spend search only on the *unknown publisher*, never on facts a known publisher's page
already lists. Assume every row is reachable until the whole ladder below has missed it.

---

## Hard rules

1. **A supplied link is fetched before anything else, no exceptions.** If the input
   contains a URL, that URL is rank 1 on the ladder below — not a suggestion to weigh
   against search. `WebFetch` it before running `lookup-book.js`, before any `WebSearch`,
   before checking whether it's "the right" page. It's the user's own link; they gave it to
   you specifically to save you the discovery step search exists for. Only fall through to
   rung 2+ if that fetch is missing a Required field — never because a search "might be
   faster" or turn up something better.
2. **Never guess.** Don't infer a publisher from a design resemblance or a distributor's
   stock listing. If nothing names it, defer the row (see *When to stop*).
3. **Never copy prices.** Every AbeBooks record carries `offers.price`, and booksellers mix
   price language into descriptions. None of it enters any field.
4. **Verify title *and* author** before believing any fuzzy-matching source. A match on
   only one of the two is a miss.
5. **Watermarked covers don't ship.** Set `cover_image` to null and note "cover to be
   photographed".

---

## Triage: do you need search at all?

| What you have | Next move |
|---|---|
| A supplied link | Fetch it first — it may already hold every field |
| Publisher name or URL | Publisher site directly — [index-grep](#publisher-sites) for the book |
| ISBN | `scripts/lookup-book.js --isbn …`, then the publisher site |
| Artist name only | The [artist's own site](#artist-sites) — usually a full bibliography |
| Title + author only | `scripts/lookup-book.js "full title author"` (AbeBooks first) |
| Nothing works | Defer — record what is known and what is missing |

---

## The ladder

Ranked by hit rate on **art and photobooks**, which differs from trade books — a
photobook shop outranks a general index here. All reachable without search.

| # | Host | How to reach it | Best for |
|---|---|---|---|
| 1 | Supplied link | Fetch it as given | Whatever the row already points at — always read it first |
| 2 | Publisher's own site | Index-grep, WordPress / Shopify APIs | Every core field at once — the best record when reachable |
| 3 | AbeBooks | `servlet/SearchResults?kn=…` → JSON-LD | Title + author with no publisher; anything with an ISBN |
| 4 | Artist's own site | `{name}.com`, `/books`, `/publications` | Complete bibliography; settles attribution |
| 5 | ARTBOOK / D.A.P. | `artbook.com/{isbn13}.html` | US-distributed art books; works when the publisher is behind Cloudflare |
| 6 | Photobookstore (UK) | Shopify `suggest.json` | Broadest photobook stock; `vendor` = publisher |
| 7 | OpenLibrary | `search.json`, `api/books`, covers | Trade and museum titles; edition disambiguation |
| 8 | Printed Matter | `curl` + browser UA (403s to WebFetch) | Artists' books and zines nothing else indexes |
| 9 | Mack / Twelve / Loose Joints / Setanta / Deadbeat / TBW | Shopify `suggest.json` | Their own imprints, in depth |
| 10 | IDEA Books | `ideabooks.nl` — `/media/` CDN serves covers to plain `curl` | European art-book distribution |
| 11 | Walther König | `buchhandlung-walther-koenig.de` | German / European exhibition catalogues |

**Below the line**, only when all of these miss: WorldCat, LOC SRU (thin for post-2020 small
press), Google Books (see warning below).

`scripts/lookup-book.js` chains AbeBooks with its fallbacks in one call. The copy in
`plans/stub-fill/lookup.js` is identical but gitignored — cite and maintain `scripts/`.

---

## Source notes

### AbeBooks — best discovery source, no key

Search-results HTML embeds a `schema.org` `ItemList` of `Book` records: title, `isbn`,
`publisher.name`, `author.name`, `bookFormat`, `image`. It indexes small-press photobooks
OpenLibrary has never heard of.

```bash
curl -s -A 'Mozilla/5.0' 'https://www.abebooks.com/servlet/SearchResults?kn=mizutani+hanon' \
  | grep -o '{"@context":"https://schema.org","@type":"ItemList".*}]}'
```

- **It never returns empty.** On a true miss it gives five confident, unrelated books
  (`Aaron McElroy Sweet` → personalised children's storybooks). Cross-check a suspicious
  hit on a Shopify shop, which reports "0 results" honestly.
- **Match the payload, not the script tag.** Attribute order varies, so a strict
  `<script type="application/ld\+json">` regex misses pages with two such tags. Anchor on
  `"@type":"ItemList"`.
- **Pass the full title**, colon and subtitle included. Truncating at the colon dropped
  the hit rate on the test set from 11/14 to 9/14.

### Publisher sites

**Index-grep, don't guess slugs.** Fetch the catalogue / "all books" page, grep it for
real hrefs, fetch the match. No visible index? Try `/sitemap.xml` and `/sitemap_index.xml`.

```bash
curl -s -A 'Mozilla/5.0' https://www.akionagasawa.com/en/publishing/ \
  | grep -oE 'href="[^"]*/shop/books/[^"]*"' | sort -u | grep -i record
```

Akio Nagasawa's *Record No. 26* lives at `…/record-no-26/`; *No. 34* at `…/record-no34/`.
No pattern predicts that; one index fetch finds it.

**Site search is just a URL** — `?s=` on WordPress, `/search?q=` on shops.

**WordPress** (most museums and small presses):

```
/wp-json/wp/v2/search?search={title}      # cross-post-type; fastest way in
/wp-json/wp/v2/pages?search={title}
/wp-json/wp/v2/product?search={title}     # WooCommerce
/wp-json/wp/v2/media?search={slug}        # full-size cover URLs
```

Neither universal nor complete: MACBA returns 404/HTML; IMA's `/search` returns `[]` for
a title its own `?s=` page renders. Check status and content-type before parsing, and fall
back to the HTML page's `og:image` / `og:description`. An `og:image` path can date a
record when nothing else does — `/uploads/2016/07/exhibition-hanon_og-1200x630.jpg` puts
*Hanon* at July 2016.

**Shopify** (Mack and most independent photobook shops):

```bash
# Brackets MUST be URL-encoded, or the shell eats them and you get an empty body
curl -s 'https://mackbooks.co.uk/search/suggest.json?q=moriyama&resources%5Btype%5D=product&resources%5Blimit%5D=5'
curl -s 'https://{shop}/products/{handle}.json'   # full record incl. images
```

`vendor` is the publisher — often the one missing fact.

- Verified to answer: **`www.photobookstore.co.uk`** (try first), `mackbooks.co.uk`,
  `twelve-books.com`, `loosejoints.biz`, `www.setantabooks.com`, `deadbeatclub.com`,
  `tbwbooks.com`, `shop.photoeye.com`.
- Confirmed *not* Shopify: dashwoodbooks, nieves.ch, aperture.org, steidl.de,
  ideabooks.nl, chosecommune.com, void.photo.

### Artist sites

Often a complete bibliography — publisher, year, pages, edition size, binding — written by
the maker, and the authority on attribution. *Bomba* was filed under Jason Nocito; its
absence from his bibliography and presence on thomasprior.com settled it.

The limit: many are image-only. thomasprior.com's *Bomba* page is a bare carousel and its
`wp-json` `content.rendered` is empty. Read the page once, then move on.

### OpenLibrary — no key, no cap

```bash
# title/author → publisher, year, ISBNs, pages
curl -s 'https://openlibrary.org/search.json?q=miserachs+barcelona&fields=title,author_name,publisher,publish_year,isbn,number_of_pages_median&limit=5'
# ISBN → contributors with roles, subjects, pagination, covers
curl -s 'https://openlibrary.org/api/books?bibkeys=ISBN:9781588397256&jscmd=data&format=json'
```

Good for trade and museum titles, thin for small-press photobooks. Separates editions well
(the two *Miserachs Barcelona* editions come back with distinct ISBNs and page counts).

### Google Books — last resort

Returns errors inside **HTTP-200-looking JSON**. Once the daily quota is gone, every call
is `429` with `"Quota exceeded for quota metric 'Queries'"`. Check the status *and*
`j.error`, never just `j.items`.

---

## Blocked hosts

| Symptom | Move |
|---|---|
| `403` to WebFetch | `curl` with a browser `User-Agent` (Printed Matter) |
| `429` + "Checking your browser…" | Skip the host (Dashwood Books) — artist site or OpenLibrary instead |
| `429` on repeat fetches | Space out same-host calls (the Met's `met-publications` throttles fast) |
| Cloudflare CAPTCHA everywhere | Static assets often still serve — try `/wp-content/uploads/…` directly |
| Parked or unrelated template | The imprint is gone; don't scrape the squatter (ceibaeditions.com; akinabooks.com) |
| Empty body from `suggest.json` | Brackets not encoded — `%5Btype%5D`, not `[type]` |
| Confident, irrelevant results | AbeBooks fuzzy-matched — re-check title and author; cross-check on Shopify |

---

## Covers

**OpenLibrary — always append `?default=false`.** Without it a missing cover returns
HTTP 200 and a 43-byte 1×1 GIF. With it: `404` when absent, `302` to the image when present.

```bash
curl -sL -o cover.jpg -w '%{http_code}\n' 'https://covers.openlibrary.org/b/isbn/{isbn13}-L.jpg?default=false'
```

**AbeBooks ISBN image** — different from the JSON-LD `image` field, and often present when
keyword search finds nothing. 404s honestly. Rescued a watermarked Super Labo title
(270×353, small but clean).

```bash
curl -sL -o cover.jpg -w '%{http_code}\n' 'https://pictures.abebooks.com/isbn/{isbn13}-us.jpg'
```

**Watermarks.** Le Plac'Art (`placartphoto.com`) and `josefchladek.com` stamp their domain
across their photos. Try the AbeBooks ISBN image first; otherwise null + "cover to be
photographed".

**Series and variants.** When volumes share one design in different colourways (Nocito's
three *Pud* books differ only in cloth and foil), filenames and alt text lie. Hash the
candidate against each volume's detail-page image and match by digest:

```bash
curl -s -o cand.jpg '{image-url}' && md5 -q cand.jpg
```

**Dark backdrops.** `auto-crop-covers.py` reads a book shot on near-black as "already
tight". Find the real bounds:

```python
import numpy as np
from PIL import Image

im = Image.open(p).convert('RGB')
a = np.asarray(im).astype(int)
mask = a.max(axis=2) > 45                      # brighter than the backdrop
cols = np.where(mask.sum(axis=0) > im.height * 0.15)[0]
rows = np.where(mask.sum(axis=1) > im.width * 0.05)[0]
im.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1)).save(p, quality=92)
```

---

## When to stop

If the missing field is the **publisher** and no rung names it, stop. Defer the row with
what is known and what is missing, and say the budget ran out. Never pad a skip list with
books that weren't actually researched.

---

## Track record

- **2026-08-27:** 14 rows deferred when search ran out. 8 closed with zero searches. The 6
  left were all unknown-publisher rows; adding the AbeBooks rung closed one more
  (id 762, Mizutani *Hanon* → Amana, 9784865872941).
- **Ladder accuracy:** against 14 hand-filled rows, it recovered the exact same ISBN for
  11 (79%) with zero WebSearch calls.
