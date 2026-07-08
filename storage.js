/**
 * Storage layer: write scrape results to local JSON (always) and optionally
 * to Neon Postgres (if DATABASE_URL is set), matching a schema your
 * api/products.js endpoint can query directly.
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const OUTPUT_DIR = "scrape_output";

export function saveJson(data, filename) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Saved ${Array.isArray(data) ? data.length : 1} record(s) -> ${filePath}`);
  return filePath;
}

// ---------------------------------------------------------------------------
// Optional: push straight into Neon Postgres.
// Only activates if DATABASE_URL env var is set — otherwise scraper still
// works fully with JSON-only output.
// ---------------------------------------------------------------------------

export function getPgClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  return new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
}

const CREATE_TABLES_SQL = `
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
`;

export async function ensureSchema(client) {
  await client.query(CREATE_TABLES_SQL);
}

export async function upsertProduct(client, product, category = null, productUrl = null) {
  await client.query(
    `
    INSERT INTO products (sku, name, brand, category, price, old_price,
                           rating, review_count, seller_name, seller_rating,
                           stock_status, product_url, last_scraped)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
    ON CONFLICT (sku) DO UPDATE SET
        price = EXCLUDED.price,
        rating = EXCLUDED.rating,
        review_count = EXCLUDED.review_count,
        seller_name = EXCLUDED.seller_name,
        seller_rating = EXCLUDED.seller_rating,
        stock_status = EXCLUDED.stock_status,
        last_scraped = now()
    `,
    [
      product.sku,
      product.name,
      product.brand,
      category,
      product.price,
      product.oldPrice,
      product.rating,
      product.reviewCount,
      product.sellerName,
      product.sellerRating,
      product.stockStatus,
      productUrl,
    ]
  );

  await client.query(
    `
    INSERT INTO product_snapshots (sku, price, review_count, rating, stock_status)
    VALUES ($1,$2,$3,$4,$5)
    `,
    [product.sku, product.price, product.reviewCount, product.rating, product.stockStatus]
  );

  for (const rev of product.reviews || []) {
    const reviewDate = parseDate(rev.date);
    await client.query(
      `
      INSERT INTO reviews (sku, reviewer, rating, review_date, review_text, verified_purchase)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (sku, reviewer, review_date, review_text) DO NOTHING
      `,
      [product.sku, rev.reviewer, rev.rating, reviewDate, rev.text, rev.verifiedPurchase]
    );
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Handles "15-04-2026" / "15/04/2026" style dates. Adjust if Jumia uses a
  // different format once you've verified via inspectPage.js.
  const m = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  return isoMatch ? dateStr : null;
}
