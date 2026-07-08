"""
Main scrape orchestrator.

Stage 1 (cheap, broad): scrape flash-sales + category listing pages.
Stage 2 (expensive, narrow): deep-scrape only products worth watching
  (currently: everything in flash sales, since that's already pre-filtered
  by Jumia to be high-turnover — extend `should_deep_scrape()` later to
  also trigger on rank-position jumps once you're storing rank history).

Usage:
    python main.py
"""
import time
from urllib.parse import urljoin

from client import JumiaClient
from parsers import parse_listing_cards, parse_product_page
from storage import save_json, get_pg_connection, ensure_schema, upsert_product

BASE_URL = "https://www.jumia.ma"

FLASH_SALES_URL = urljoin(BASE_URL, "/flash-sales/")

# Extend with whatever category paths you decide are your priority verticals
CATEGORY_URLS = [
    urljoin(BASE_URL, "/telephone-tablette/"),
    urljoin(BASE_URL, "/maison-cuisine/"),
    urljoin(BASE_URL, "/beaute-sante/"),
]


def scrape_listing(client: JumiaClient, url: str, label: str) -> list[dict]:
    print(f"\n[stage 1] fetching listing: {label} ({url})")
    resp = client.get(url)
    items = parse_listing_cards(resp.text)
    print(f"  -> found {len(items)} product cards")
    return items


def should_deep_scrape(item: dict) -> bool:
    """
    Gate for stage 2. Right now: anything with a flash-sale stock bar present.
    Extend this once you're persisting rank history — e.g. also trigger when
    a product's category rank improved vs. the last snapshot.
    """
    return item.get("flash_sale_stock_claimed_pct") is not None


def deep_scrape_product(client: JumiaClient, item: dict) -> dict | None:
    url = item.get("product_url")
    if not url:
        return None
    full_url = url if url.startswith("http") else urljoin(BASE_URL, url)
    print(f"  [stage 2] deep-scraping: {full_url}")
    resp = client.get(full_url)
    detail = parse_product_page(resp.text)
    detail["flash_sale_stock_claimed_pct"] = item.get("flash_sale_stock_claimed_pct")
    detail["product_url"] = full_url
    return detail


def main():
    client = JumiaClient()

    # --- Stage 1: flash sales (also doubles as your "seller in flash sale" source) ---
    flash_items = scrape_listing(client, FLASH_SALES_URL, "flash sales")
    save_json(flash_items, "flash_sales_listing.json")

    # --- Stage 1: category listings, for candidate pool breadth ---
    all_category_items = []
    for cat_url in CATEGORY_URLS:
        items = scrape_listing(client, cat_url, cat_url)
        all_category_items.extend(items)
    save_json(all_category_items, "category_listings.json")

    # --- Stage 2: deep-scrape only the flash-sale subset for now ---
    deep_results = []
    conn = get_pg_connection()
    if conn:
        ensure_schema(conn)
        print("[db] connected to Postgres, will upsert as we go")
    else:
        print("[db] DATABASE_URL not set — JSON-only mode")

    for item in flash_items:
        if not should_deep_scrape(item):
            continue
        try:
            detail = deep_scrape_product(client, item)
            if detail:
                deep_results.append(detail)
                if conn:
                    upsert_product(conn, detail, category="flash-sale", product_url=detail.get("product_url"))
        except Exception as exc:
            print(f"  [warn] failed on {item.get('product_url')}: {exc}")

    save_json(deep_results, "product_details.json")

    if conn:
        conn.close()

    print(f"\nDone. {len(flash_items)} flash items, "
          f"{len(all_category_items)} category items, "
          f"{len(deep_results)} deep-scraped products.")


if __name__ == "__main__":
    main()
