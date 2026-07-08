# Jumia Scraper

Rate-limited, self-identified scraper for jumia.ma, built around what their
robots.txt allows (identified bot, <200 req/min — this defaults to 120/min
with margin).

## ⚠️ Before running this for real

The CSS selectors in `parsers.py` are **best-guess placeholders**, not
confirmed-correct. I could not verify live markup while writing this, and
Jumia (like most sites) changes class names periodically. Do this first:

```bash
pip install -r requirements.txt --break-system-packages
python inspect_page.py https://www.jumia.ma/flash-sales/ flash_dump.html
python inspect_page.py https://www.jumia.ma/<some-product-url>.html product_dump.html
```

Open both dumps, find the real class names for product cards, price,
reviews, stock bar, etc., and update the selectors in `parsers.py`
(each one is marked `# VERIFY`).

## Setup

```bash
pip install -r requirements.txt --break-system-packages

# Optional — only needed if you want direct Neon Postgres writes.
# Without this set, the scraper still runs fine and just writes JSON.
export DATABASE_URL="postgres://user:pass@host/dbname"
```

## Run

```bash
python main.py
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

- **Priority categories**: edit `CATEGORY_URLS` in `main.py`.
- **Deep-scrape trigger**: `should_deep_scrape()` in `main.py` currently
  triggers on "is in a flash sale". Once you're storing `product_snapshots`
  over time, extend this to also trigger on category-rank improvement.
- **Seller tracking** (products-per-seller in flash sales, discussed
  separately): the `sellers` table is already in `storage.py`'s schema —
  wire up a rollup query/cron that counts `flash_sale_product_count` per
  `seller_name` from `product_snapshots` joined to `products`.
- **Scheduling**: run flash-sales scrape hourly, category scrape daily,
  via cron or a scheduled Vercel/GitHub Action — this script itself has
  no scheduler built in.
