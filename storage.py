"""
Storage layer: write scrape results to local JSON (always) and optionally to
Neon Postgres (if DATABASE_URL is set), matching a schema your api/products.js
endpoint can query directly.
"""
import json
import os
from datetime import datetime, timezone

OUTPUT_DIR = "scrape_output"


def save_json(data, filename: str):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"Saved {len(data) if isinstance(data, list) else 1} record(s) -> {path}")
    return path


# ---------------------------------------------------------------------------
# Optional: push straight into Neon Postgres.
# Only activates if DATABASE_URL env var is set — otherwise scraper still
# works fully with JSON-only output.
# ---------------------------------------------------------------------------

def get_pg_connection():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return None
    import psycopg2  # pip install psycopg2-binary --break-system-packages
    return psycopg2.connect(database_url)


CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS products (
    sku TEXT PRIMARY KEY,
    name TEXT,
    brand TEXT,
    category TEXT,
    price NUMERIC,
    old_price NUMERIC,
    rating NUMERIC,
    review_count INTEGER,
    seller_name TEXT,
    seller_rating TEXT,
    stock_status TEXT,
    product_url TEXT,
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_scraped TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_snapshots (
    id SERIAL PRIMARY KEY,
    sku TEXT REFERENCES products(sku),
    price NUMERIC,
    review_count INTEGER,
    rating NUMERIC,
    stock_status TEXT,
    flash_sale_stock_claimed_pct INTEGER,
    category_rank INTEGER,
    scraped_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    sku TEXT REFERENCES products(sku),
    reviewer TEXT,
    rating NUMERIC,
    review_date DATE,
    review_text TEXT,
    verified_purchase BOOLEAN,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sku, reviewer, review_date, review_text)
);

CREATE TABLE IF NOT EXISTS sellers (
    seller_name TEXT PRIMARY KEY,
    seller_rating TEXT,
    flash_sale_product_count INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now()
);
"""


def ensure_schema(conn):
    with conn.cursor() as cur:
        cur.execute(CREATE_TABLES_SQL)
    conn.commit()


def upsert_product(conn, product: dict, category: str = None, product_url: str = None):
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO products (sku, name, brand, category, price, old_price,
                                   rating, review_count, seller_name, seller_rating,
                                   stock_status, product_url, last_scraped)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
            ON CONFLICT (sku) DO UPDATE SET
                price = EXCLUDED.price,
                rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                seller_name = EXCLUDED.seller_name,
                seller_rating = EXCLUDED.seller_rating,
                stock_status = EXCLUDED.stock_status,
                last_scraped = now()
        """, (
            product.get("sku"), product.get("name"), product.get("brand"), category,
            product.get("price"), product.get("old_price"), product.get("rating"),
            product.get("review_count"), product.get("seller_name"),
            product.get("seller_rating"), product.get("stock_status"), product_url,
        ))

        cur.execute("""
            INSERT INTO product_snapshots (sku, price, review_count, rating, stock_status)
            VALUES (%s,%s,%s,%s,%s)
        """, (
            product.get("sku"), product.get("price"), product.get("review_count"),
            product.get("rating"), product.get("stock_status"),
        ))

        for rev in product.get("reviews", []):
            review_date = _parse_date(rev.get("date"))
            cur.execute("""
                INSERT INTO reviews (sku, reviewer, rating, review_date, review_text, verified_purchase)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON CONFLICT (sku, reviewer, review_date, review_text) DO NOTHING
            """, (
                product.get("sku"), rev.get("reviewer"), rev.get("rating"),
                review_date, rev.get("text"), rev.get("verified_purchase"),
            ))

    conn.commit()


def _parse_date(date_str):
    if not date_str:
        return None
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None
