/**
 * Main scrape orchestrator.
 *
 * Stage 1 (cheap, broad): scrape flash-sales + category listing pages.
 * Stage 2 (expensive, narrow): deep-scrape only products worth watching
 *   (currently: everything in flash sales, since that's already pre-filtered
 *   by Jumia to be high-turnover — extend `shouldDeepScrape()` later to
 *   also trigger on rank-position jumps once you're storing rank history).
 *
 * Usage: node main.js
 */
import { JumiaClient } from "./client.js";
import { parseListingCards, parseProductPage } from "./parsers.js";
import { saveJson, getPgClient, ensureSchema, upsertProduct } from "./storage.js";

const BASE_URL = "https://www.jumia.ma";
const FLASH_SALES_URL = new URL("/flash-sales/", BASE_URL).toString();

// Extend with whatever category paths you decide are your priority verticals
const CATEGORY_URLS = [
  new URL("/telephone-tablette/", BASE_URL).toString(),
  new URL("/maison-cuisine/", BASE_URL).toString(),
  new URL("/beaute-sante/", BASE_URL).toString(),
];

async function scrapeListing(client, url, label) {
  console.log(`\n[stage 1] fetching listing: ${label} (${url})`);
  const resp = await client.get(url);
  const items = parseListingCards(resp.data);
  console.log(`  -> found ${items.length} product cards`);
  return items;
}

/**
 * Gate for stage 2. Right now: anything with a flash-sale stock bar present.
 * Extend this once you're persisting rank history — e.g. also trigger when
 * a product's category rank improved vs. the last snapshot.
 */
function shouldDeepScrape(item) {
  return item.flashSaleStockClaimedPct !== null && item.flashSaleStockClaimedPct !== undefined;
}

async function deepScrapeProduct(client, item) {
  if (!item.productUrl) return null;
  const fullUrl = item.productUrl.startsWith("http")
    ? item.productUrl
    : new URL(item.productUrl, BASE_URL).toString();
  console.log(`  [stage 2] deep-scraping: ${fullUrl}`);
  const resp = await client.get(fullUrl);
  const detail = parseProductPage(resp.data);
  detail.flashSaleStockClaimedPct = item.flashSaleStockClaimedPct;
  detail.productUrl = fullUrl;
  return detail;
}

async function main() {
  const client = new JumiaClient();

  // --- Stage 1: flash sales (also doubles as your "seller in flash sale" source) ---
  const flashItems = await scrapeListing(client, FLASH_SALES_URL, "flash sales");
  saveJson(flashItems, "flash_sales_listing.json");

  // --- Stage 1: category listings, for candidate pool breadth ---
  let allCategoryItems = [];
  for (const catUrl of CATEGORY_URLS) {
    const items = await scrapeListing(client, catUrl, catUrl);
    allCategoryItems = allCategoryItems.concat(items);
  }
  saveJson(allCategoryItems, "category_listings.json");

  // --- Stage 2: deep-scrape only the flash-sale subset for now ---
  const pgClient = getPgClient();
  if (pgClient) {
    await pgClient.connect();
    await ensureSchema(pgClient);
    console.log("[db] connected to Postgres, will upsert as we go");
  } else {
    console.log("[db] DATABASE_URL not set — JSON-only mode");
  }

  const deepResults = [];
  for (const item of flashItems) {
    if (!shouldDeepScrape(item)) continue;
    try {
      const detail = await deepScrapeProduct(client, item);
      if (detail) {
        deepResults.push(detail);
        if (pgClient) {
          await upsertProduct(pgClient, detail, "flash-sale", detail.productUrl);
        }
      }
    } catch (err) {
      console.log(`  [warn] failed on ${item.productUrl}: ${err.message}`);
    }
  }

  saveJson(deepResults, "product_details.json");

  if (pgClient) await pgClient.end();

  console.log(
    `\nDone. ${flashItems.length} flash items, ${allCategoryItems.length} category items, ${deepResults.length} deep-scraped products.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
