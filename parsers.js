/**
 * HTML parsers for jumia.ma pages.
 *
 * IMPORTANT: The CSS selectors below are best-guess starting points based on
 * the markup pattern Jumia-family sites (jumia.ma / .ci / .eg / etc.)
 * typically share on their shared platform. jumia.ma changes its markup
 * periodically without notice, so before relying on this in production:
 *
 *   1. Run `npm run inspect -- <url>` to dump the raw HTML for a live page.
 *   2. Open it and confirm the actual class names / structure match below.
 *   3. Adjust selectors accordingly.
 *
 * Treat every selector here as "needs verification", not "confirmed correct".
 */
import * as cheerio from "cheerio";

function toFloat(text) {
  if (!text) return null;
  const match = text.replace(/\u00a0/g, " ").match(/[\d.,]+/);
  if (!match) return null;
  return parseFloat(match[0].replace(/,/g, "").replace(/\s/g, ""));
}

/**
 * Parses a category or flash-sales listing page into a list of lightweight
 * product summaries (no reviews/seller detail — that requires the product
 * page itself).
 */
export function parseListingCards(html) {
  const $ = cheerio.load(html);
  const results = [];

  // CONFIRMED against a live /flash-sales/ dump (63 cards matched this selector).
  $("article.prd").each((_, el) => {
    const card = $(el);

    // The "core" link carries Jumia's own GA4 analytics attributes with
    // clean, already-parsed values (name/price/id/category/brand/discount).
    // These are more reliable than scraping visible text, so prefer them
    // and fall back to text parsing only if an attribute is missing.
    const link = card.find("a.core");
    const ga4Name = link.attr("data-ga4-item_name");
    const ga4Price = link.attr("data-ga4-price");
    const ga4Id = link.attr("data-ga4-item_id");
    const ga4Brand = link.attr("data-ga4-item_brand");
    const ga4Category = link.attr("data-ga4-item_category");
    const ga4Discount = link.attr("data-ga4-discount");

    const name = (ga4Name && ga4Name.trim()) || card.find("h3.name").text().trim() || null;
    const price = ga4Price ? parseFloat(ga4Price) : toFloat(card.find("div.prc").text());
    const oldPrice = toFloat(card.find("div.old").text()); // confirmed: only present when discounted
    const discountLabel = card.find("div.bdg._dsct").text().trim() || null; // confirmed, e.g. "30%"
    const discountAmount = ga4Discount ? parseFloat(ga4Discount) : null;

    // SKU lives on the wishlist button, not the main link.
    const sku = card.find("a[data-sku]").attr("data-sku") || ga4Id || null;

    // Stock-left signal: text like "13 articles restants" sits in div.stk,
    // and the % claimed is embedded in the inline style of the nested
    // div.meter._s as a linear-gradient stop (NOT a simple width:%).
    // e.g. style="background-image:linear-gradient(to right,#f68b1e 86.67%,#a3a3a6 86.67%)"
    const stockText = card.find("div.stk").clone().children().remove().end().text().trim() || null;
    const stockUnitsLeft = stockText ? toFloat(stockText) : null;

    const meter = card.find("div.meter._s");
    let stockClaimedPct = null;
    const styleAttr = meter.attr("style");
    if (styleAttr) {
      const m = styleAttr.match(/linear-gradient\([^,]+,\s*[^,]+\s+([\d.]+)%/);
      if (m) stockClaimedPct = parseFloat(m[1]);
    }

    // Rating + review count: div.rev -> "4 out of 5" text + trailing "(9)".
    // Not every card has this yet (only present once a product has reviews).
    const revBlock = card.find("div.rev");
    let rating = null;
    let reviewCount = null;
    if (revBlock.length) {
      const starsText = revBlock.find("div.stars._s").text(); // "4 out of 5"
      rating = starsText ? toFloat(starsText) : null;
      const fullText = revBlock.text(); // "...4 out of 5(9)"
      const countMatch = fullText.match(/\((\d+)\)/);
      reviewCount = countMatch ? parseInt(countMatch[1], 10) : null;
    }

    results.push({
      sku,
      name,
      brand: ga4Brand || null,
      category: ga4Category || null,
      productUrl: link.attr("href") || null,
      price,
      oldPrice,
      discountLabel,
      discountAmount,
      rating,
      reviewCount,
      flashSaleStockUnitsLeft: stockUnitsLeft,
      flashSaleStockClaimedPct: stockClaimedPct,
    });
  });

  return results;
}

/**
 * Parses a single product detail page: identity, price, rating, seller,
 * stock, and — critically — the individual dated reviews, which is your
 * primary demand-velocity signal.
 */
/**
 * Parses a single product detail page: identity, price, rating, seller,
 * stock, and — critically — the individual dated reviews, which is your
 * primary demand-velocity signal.
 *
 * NOTE (confirmed against a live product page): the page embeds a full
 * schema.org JSON-LD block (<script type="application/ld+json">) with
 * clean name/brand/sku/price/category/seller/aggregateRating data. That's
 * far more reliable than CSS-scraping scattered spans, so we parse that
 * first and only fall back to DOM selectors for things JSON-LD doesn't
 * carry (seller %, follower count, stock text).
 *
 * IMPORTANT: individual dated reviews are NOT present in this page's HTML.
 * The page only shows an aggregate count + a link like "(3 avis vérifiés)"
 * pointing to /sku/{sku}/ — that's a separate page/endpoint. If you want
 * per-review dates (needed for real velocity tracking), main.js needs to
 * fetch that /sku/{sku}/ URL separately and parse it — this function alone
 * cannot give you that.
 */
export function parseProductPage(html) {
  const $ = cheerio.load(html);

  // --- Primary source: JSON-LD schema block ---
  let ld = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (ld) return; // already found one
    try {
      const parsed = JSON.parse($(el).contents().text());
      const graph = parsed["@graph"] || [parsed];
      const product = graph.find((n) => n["@type"] === "Product");
      if (product) ld = { parsed, product, graph };
    } catch {
      // not valid JSON / not the block we want — skip
    }
  });

  const product = ld?.product || null;

  const sku = product?.sku || null;
  const name = (product?.name && product.name.trim()) || null;
  const brand = product?.brand?.name || null;
  const category = product?.category || null;

  const price = product?.offers?.price ? parseFloat(product.offers.price) : null;
  const currency = product?.offers?.priceCurrency || null;
  const inStock = product?.offers?.availability
    ? /InStock/i.test(product.offers.availability)
    : null;

  const sellerName = product?.offers?.seller?.name || null;
  const sellerId = product?.offers?.seller?.["@id"] || null;

  const rating = product?.aggregateRating?.ratingValue ?? null;
  const reviewCount = product?.aggregateRating?.ratingCount ?? null;

  const categoryBreadcrumb = [];
  const breadcrumbNode = ld?.graph?.find((n) => n["@type"] === "BreadcrumbList");
  if (breadcrumbNode?.itemListElement) {
    for (const item of breadcrumbNode.itemListElement) {
      const label = item.item?.name;
      if (label) categoryBreadcrumb.push(label);
    }
  }

  // --- Fallback / supplementary: things JSON-LD doesn't carry ---
  // Old/strikethrough price, if discounted (JSON-LD only gives the live price).
  const oldPrice = toFloat($("span.-tal.-gy5.-lthr").first().text()) || null;

  // Seller performance %: text like "94%Évaluation du vendeur" near the seller block.
  let sellerRatingPct = null;
  $("bdo[dir='ltr']").each((_, el) => {
    const t = $(el).text().trim();
    if (/^\d+%$/.test(t) && sellerRatingPct === null) {
      sellerRatingPct = parseFloat(t);
    }
  });

  // Seller follower count: <p data-followers="true"><span class="-m">1511 </span>...
  const followerText = $('p[data-followers="true"] span.-m').first().text().trim();
  const sellerFollowers = followerText ? parseInt(followerText.replace(/[^\d]/g, ""), 10) : null;

  // Link to the separate reviews page, since individual reviews live there, not here.
  const reviewsPageUrl = sku ? `/sku/${sku}/` : null;

  return {
    sku,
    name,
    brand,
    category,
    price,
    oldPrice,
    currency,
    inStock,
    rating,
    reviewCount,
    sellerName,
    sellerId,
    sellerRatingPct,
    sellerFollowers,
    categoryBreadcrumb,
    reviewsPageUrl, // fetch + parse this separately for dated individual reviews
  };
}
