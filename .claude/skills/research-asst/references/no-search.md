# research-asst — Researching without WebSearch

`WebSearch` is capped at **200 calls per session** (~100 rows of book research). When it
refuses, research is *not* over. `WebFetch`, `curl` and public JSON APIs are **not capped**.

> Search buys **discovery** — learning which host holds the record. Once you know the
> host, go straight at it.

That reframing is the whole technique. It also means: **spend search on the unknown
publisher, not on facts a known publisher's own page already lists.** Of fourteen rows
deferred when the budget ran out on 2026-08-27, eight were closed with zero searches. The
six that stayed deferred were the ones whose *publisher was unknown* — and once the
AbeBooks rung below was added, one of those six fell too (id 762, Mizutani *Hanon* →
Amana, 9784865872941). Assume a row is reachable until the whole ladder has missed it.

## Decide first: do you actually need search?

| What you have | Next move |
|---|---|
| Publisher name or URL | Fetch the publisher site directly — index-grep for the slug (below) |
| ISBN | OpenLibrary `api/books`, then the publisher |
| Artist name only | Artist's own site — usually a complete bibliography |
| Title + author, no publisher, no ISBN | **AbeBooks keyword search** (below) — it resolves most of these to an exact ISBN + publisher; OpenLibrary `search.json` second |
| Nothing works | Defer the row with what is known and what is missing — never guess |

Never spend a search on a fact the publisher page will list anyway.

## The uncapped stack

**AbeBooks — the highest-yield first stop, and it needs no key.** Its search-results HTML
embeds a `schema.org` `ItemList` of `Book` records: exact title, `isbn`, `publisher.name`,
`author.name`, `bookFormat`, and an `image` cover URL. It indexes small-press art
photobooks that OpenLibrary has never heard of.

```bash
curl -s -A 'Mozilla/5.0' 'https://www.abebooks.com/servlet/SearchResults?kn=mizutani+hanon' \
  | grep -o '{"@context":"https://schema.org","@type":"ItemList".*}]}'
```

Two rules, both non-negotiable:

- **Verify the title *and* the author before believing it.** AbeBooks fuzzy-matches and
  never returns empty: on a true miss it answers with five confidently-formatted,
  completely unrelated books (`Aaron McElroy Sweet` → children's personalised storybooks).
  A result that matches on only one of the two is a miss.
- **Never copy `offers.price`.** Every record carries one. Pricing must not enter any field.
- **Match the payload, not the script tag.** Attribute order varies, so a strict
  `<script type="application/ld\+json">` regex finds nothing on a page that has two of
  them. Anchor on `"@type":"ItemList"`, as the grep above does.

**Query shaping matters more than it looks.** Pass the *full* title, colon and subtitle
included. Truncating at the colon dropped the ladder's hit rate on a fourteen-row test set
from 11/14 to 9/14.

`scripts/lookup-book.js` runs this rung plus the two below in one call:

```bash
node scripts/lookup-book.js "mizutani hanon"        # or: --isbn 9784865872941
```

(`plans/stub-fill/lookup.js` is the same tool, but `plans/` is gitignored — cite and
maintain the tracked copy in `scripts/`.)

Measured against fourteen rows already filled by hand, the ladder recovered the *exact
same ISBN* for eleven of them (79%) with zero WebSearch calls.

**OpenLibrary** — no key, no cap, generous rate limit.

```bash
# title/author lookup — returns publisher, year, ISBNs, pages
curl -s 'https://openlibrary.org/search.json?q=miserachs+barcelona&fields=title,author_name,publisher,publish_year,isbn,number_of_pages_median&limit=5'
# ISBN lookup — returns contributors with roles, subjects, pagination, cover URLs
curl -s 'https://openlibrary.org/api/books?bibkeys=ISBN:9781588397256&jscmd=data&format=json'
```

Good for trade- and museum-published titles. Thin to empty for small-press art photobooks.
It distinguishes editions well — the two *Miserachs Barcelona* editions come back as
separate records with separate ISBNs and page counts.

**OpenLibrary covers — always append `?default=false`.** Without it a missing cover
returns **HTTP 200 and a 43-byte 1×1 GIF**, which every naive check treats as success.
With it: `404` when absent, `302` to the real image when present.

```bash
curl -sL -o cover.jpg -w '%{http_code}\n' 'https://covers.openlibrary.org/b/isbn/{isbn13}-L.jpg?default=false'
```

**WordPress publishers** (most museums and small presses) expose a REST API:

```
/wp-json/wp/v2/search?search={title}      # cross-post-type; the fastest way in
/wp-json/wp/v2/pages?search={title}
/wp-json/wp/v2/product?search={title}     # WooCommerce shops
/wp-json/wp/v2/media?search={slug}        # full-size cover URLs
```

Not universal, and not complete where it exists: MACBA's returns 404/HTML, and IMA's
`/wp-json/wp/v2/search` returns `[]` for a title its own `?s=` page renders. Check the
status and content-type before parsing; fall back to fetching the HTML page and reading
`og:image` / `og:description`. An `og:image` path often dates the record when nothing else
will — `/uploads/2016/07/exhibition-hanon_og-1200x630.jpg` puts *Hanon* at July 2016.

**Site-internal search is just a URL.** `?s=` on WordPress, `/search?q=` on shops. That is
discovery without WebSearch, as long as you can name the host.

**Shopify shops** (Mack, and most independent photobook shops) expose:

```bash
# URL-encode the brackets, or the shell eats them and you get an empty body
curl -s 'https://mackbooks.co.uk/search/suggest.json?q=moriyama&resources%5Btype%5D=product&resources%5Blimit%5D=5'
curl -s 'https://{shop}/products/{handle}.json'   # full product record incl. images
```

`vendor` in the response is the publisher — often the one fact you were missing. Hosts
verified to answer `suggest.json`: **`www.photobookstore.co.uk`** (broadest stock, try it
first), `mackbooks.co.uk`, `twelve-books.com`, `loosejoints.biz`, `www.setantabooks.com`,
`deadbeatclub.com`, `tbwbooks.com`, `shop.photoeye.com`. Unlike AbeBooks these answer a
real "0 results" honestly, so use one to sanity-check a suspicious AbeBooks hit.
Confirmed *not* Shopify, don't bother: dashwoodbooks
(429 bot check), nieves.ch, aperture.org, steidl.de, ideabooks.nl, chosecommune.com,
void.photo.

**Google Books is unreliable and lies about it.** It returns errors inside an
**HTTP-200-looking JSON body**, and once the daily project quota is gone every call is
`429` with `"Quota exceeded for quota metric 'Queries'"`. Check the HTTP status *and*
`j.error`, never just `j.items`. Treat it as a last resort, not a first stop.

## The ten places to try, in order

All fetchable without a search. Rank is by hit rate on art and photobooks, which is not
the same as on trade books — a general-purpose index sits below a photobook shop here.

| # | Host | Reach it by | Best for |
|---|---|---|---|
| 1 | AbeBooks | `abebooks.com/servlet/SearchResults?kn=…` → JSON-LD | Anything with an ISBN. Title+author only, no publisher |
| 2 | The publisher's own site | Constructed URL, then index-grep | Every core field at once — always the best record when reachable |
| 3 | The artist's own site | `{name}.com`, `/books`, `/publications` | Complete bibliography; settles attribution disputes |
| 4 | ARTBOOK / D.A.P. | `artbook.com/{isbn13}.html` | US-distributed art books; works when the publisher is Cloudflared |
| 5 | Photobookstore (UK) | Shopify `suggest.json` | Broadest photobook stock; `vendor` gives you the publisher |
| 6 | OpenLibrary | `search.json`, `api/books`, `covers` | Trade and museum titles; edition disambiguation; covers |
| 7 | Printed Matter | `printedmatter.org` — **`curl` + browser UA, 403s to WebFetch** | Artists' books and zines nothing else indexes |
| 8 | Mack / Twelve / Loose Joints / Setanta / Deadbeat / TBW | Shopify `suggest.json` | Their own imprints, in depth |
| 9 | IDEA Books | `ideabooks.nl` — `/media/` CDN serves covers to plain `curl` | European art-book distribution |
| 10 | Walther König | `buchhandlung-walther-koenig.de` | German/European exhibition catalogues |

Below the line, and only when the above miss: WorldCat, LOC SRU (thin for post-2020
small-press), and Google Books (see its warning above). Dashwood Books is *not* on this
list — it 429s every automated request.

## Index-grep instead of guessing slugs

Do not construct a product URL from the title. Fetch the publisher's **index / catalogue
page**, grep it for real hrefs, then fetch the one that matches.

```bash
curl -s -A 'Mozilla/5.0' https://www.akionagasawa.com/en/publishing/ \
  | grep -oE 'href="[^"]*/shop/books/[^"]*"' | sort -u | grep -i record
```

Akio Nagasawa's *Record No. 26* is `…/record-no-26/`; *No. 34* is `…/record-no34/`, with
no hyphen. No amount of pattern-guessing finds that; one index fetch does. The same trick
works on any publisher's "all books" / "catalogue" / sitemap page — try
`/sitemap.xml` and `/sitemap_index.xml` when there is no visible index.

## Prefer the artist's own site to a bookseller

An artist's site is often a **complete bibliography** — publisher, year, page count,
edition size, binding, per title — authored by the person who made the books. It is also
the authority on what is *theirs*: *Bomba* was filed in the collection under Jason
Nocito, and its absence from Nocito's own bibliography plus its presence on
thomasprior.com settled the attribution. Booksellers, by contrast, sit behind bot checks
(Dashwood Books returns `429` with a "Checking your browser…" interstitial) and mix in
price language you must not copy.

The limit: plenty of artist sites are image-only. thomasprior.com's *Bomba* page is a bare
carousel of `wp-content/uploads` JPEGs, and its `wp-json` record has an empty
`content.rendered` — no publisher is recoverable there at any price. Read the page, then
move on rather than re-fetching it in different ways.

## Blocked hosts and their ways around

| Symptom | Move |
|---|---|
| `403` to WebFetch | `curl` with a browser `User-Agent` (Printed Matter) |
| `429` + browser interstitial | Skip the host — artist site or OpenLibrary instead (Dashwood) |
| `429` on repeat fetches | Space out same-host calls; the Met's `met-publications` throttles fast |
| Cloudflare CAPTCHA on everything | Static assets often still serve: try `/wp-content/uploads/…` directly |
| Domain looks wrong (parked template) | The imprint is gone — stop, don't scrape the squatter (ceibaeditions.com; akinabooks.com now serves an Indonesian retail template) |
| Empty body from a Shopify `suggest.json` | The brackets weren't URL-encoded — `%5Btype%5D`, not `[type]` |
| Confident results, all irrelevant | AbeBooks fuzzy-matched. Re-check author *and* title; cross-check on a Shopify shop |

## Matching a cover to the right volume

When a series reuses one cover design in different colourways — Nocito's three *Pud*
books are identical but for cloth and foil colour — filenames and alt text lie. **Hash
the candidate images against the ones on each volume's own detail page:**

```bash
curl -s -o cand.jpg '{image-url}' && md5 -q cand.jpg
```

Match by digest, then install. Applies to any variant/edition ambiguity, not just series.

## When the only cover you can find is watermarked

Booksellers who photograph their own stock — **Le Plac'Art (`placartphoto.com`) and
`josefchladek.com` are the two you will hit most** — stamp the domain across the image,
often three times. A watermarked cover does not ship. Set `cover_image` to null and say
"cover to be photographed" in notes.

Before giving up, try the AbeBooks **ISBN image URL directly**:

```bash
curl -sL -o cover.jpg -w '%{http_code}\n' 'https://pictures.abebooks.com/isbn/{isbn13}-us.jpg'
```

This is *not* what the JSON-LD `image` field returns, and it often exists when a keyword
search finds nothing — it rescued a watermarked Super Labo title at 270x353, small but
clean. It 404s honestly when absent.

**`auto-crop-covers.py` gives up on dark backdrops.** A book shot on near-black reads as
"already tight" because the padding is not white. Find the real bounds instead:

```python
a = np.array(Image.open(p).convert('RGB')).astype(int)
mask = a.max(axis=2) > 45          # anything brighter than the backdrop
cols = np.where(mask.sum(axis=0) > im.height * 0.15)[0]
rows = np.where(mask.sum(axis=1) > im.width * 0.05)[0]
im.crop((cols.min(), rows.min(), cols.max()+1, rows.max()+1)).save(p, quality=92)
```

## When to stop and say so

If the missing field is the **publisher** and no rung of the ladder names it — AbeBooks
included — stop. Record
the row as deferred with *what is known and what is missing*, and say the budget ran out.
Never fill a skip list with books that were never actually researched, and never infer a
publisher from a design resemblance or a distributor's stock listing.
