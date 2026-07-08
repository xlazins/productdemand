# Jumia Scraper (Node)

Same design as before, ported to JS so it matches your Next.js/Vercel stack —
one language across the scraper, the API, and the dashboard.

Rate-limited, self-identified scraper for jumia.ma, built around what their
robots.txt allows (identified bot, <200 req/min — this defaults to 120/min
with margin).

## ⚠️ Before running this for real

The CSS selectors in `parsers.js` are **best-guess placeholders**, not
confirmed-correct. I could not verify live markup while writing this, and
Jumia (like most sites) changes class names periodically. Do this first:

```bash
npm install
node inspectPage.js https://www.jumia.ma/flash-sales/ flash_dump.html
node inspectPage.js https://www.jumia.ma/<some-product-url>.html product_dump.html
```

Open both dumps, find the real class names for product cards, price,
reviews, stock bar, etc., and update the selectors in `parsers.js`
(each one is marked `// VERIFY`).

## Setup

```bash
npm install

# Optional — only needed if you want direct Neon Postgres writes.
# Without this set, the scraper still runs fine and just writes JSON.
export DATABASE_URL="postgres://user:pass@host/dbname"
```

## Run

```bash
npm start
# or: node main.js
```

This will:
1. Scrape the flash-sales listing page → `scrape_output/flash_sales_listing.json`
2. Scrape your priority category listing pages → `scrape_output/category_listings.json`
3. Deep-scrape the product page for every flash-sale item (full review
   history with dates, seller info, rating breakdown) → `scrape_output/product_details.json`
4. If `DATABASE_URL` is set, also upsert everything into Postgres tables
   (`products`, `product_snapshots`, `reviews`) — schema auto-created on
   first run.

## Extending

- **Priority categories**: edit `CATEGORY_URLS` in `main.js`.
- **Deep-scrape trigger**: `shouldDeepScrape()` in `main.js` currently
  triggers on "is in a flash sale". Once you're storing `product_snapshots`
  over time, extend this to also trigger on category-rank improvement.
- **Seller tracking** (products-per-seller in flash sales): the `sellers`
  table is already in `storage.js`'s schema — wire up a rollup query/cron
  that counts `flash_sale_product_count` per `seller_name` from
  `product_snapshots` joined to `products`.
- **Scheduling**: this script has no scheduler built in. Two good options
  given your stack:
  - A **GitHub Action** on a cron schedule (`schedule: cron: ...`) that
    checks out the repo, runs `npm install && node main.js` with
    `DATABASE_URL` as a repo secret — flash sales hourly, categories daily.
  - A **Vercel Cron Job** calling a dedicated `/api/scrape` endpoint —
    only viable if a run finishes within your plan's function timeout
    (Hobby: 10s, Pro: up to 300s), which a full flash-sale + deep-scrape
    pass likely won't on Hobby. GitHub Actions has no such limit, so it's
    the safer default for this.

## Why this isn't in `/api`

Vercel's `/api` folder is for short-lived serverless functions, not
long-running crawl jobs. Keep this scraper as a separate script/repo that
writes to Postgres; `/api/products.js` (a real serverless function) then
just reads from Postgres and serves JSON to the dashboard — fast, stateless,
and well within any function timeout.
