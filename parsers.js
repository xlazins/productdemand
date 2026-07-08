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

  $("article.prd").each((_, el) => {
    // VERIFY: product card container
    const card = $(el);
    const link = card.find("a.core"); // VERIFY: main link wrapping the card
    const name = card.find("h3.name").text().trim() || null;
    const price = toFloat(card.find("div.prc").text());
    const oldPrice = toFloat(card.find("div.old").text()); // VERIFY: strikethrough price
    const discountLabel = card.find("div.bdg._dsct").text().trim() || null; // VERIFY: discount badge

    // Flash-sale-specific: stock progress bar, if present
    const stockBar = card.find("div.bgt"); // VERIFY: "% claimed" bar
    let stockClaimedPct = null;
    const styleAttr = stockBar.attr("style");
    if (styleAttr) {
      const m = styleAttr.match(/width:\s*(\d+)%/);
      if (m) stockClaimedPct = parseInt(m[1], 10);
    }

    results.push({
      name,
      productUrl: link.attr("href") || null,
      price,
      oldPrice,
      discountLabel,
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
export function parseProductPage(html) {
  const $ = cheerio.load(html);

  let sku = null;
  $("*").each((_, el) => {
    const t = $(el).text();
    if (/^SKU/i.test(t.trim()) && !sku) {
      sku = t.replace(/SKU/i, "").trim().replace(/^:/, "").trim();
    }
  });

  const name = $("h1.-fs20").first().text().trim() || null; // VERIFY: product title
  const brand = $("a.link-to-brandstore").first().text().trim() || null; // VERIFY: brand link

  const price = toFloat($("span.-b.-ltr.-tal.-fs24").first().text()); // VERIFY: current price
  const oldPrice = toFloat($("span.-tal.-gy5.-lthr").first().text()); // VERIFY: original price

  const ratingText = $("div.stars._m._al").first().text(); // VERIFY: rating summary block
  const rating = ratingText ? toFloat(ratingText) : null;

  let reviewCount = null;
  $("*").each((_, el) => {
    const t = $(el).text();
    if (/avis|reviews/i.test(t) && reviewCount === null) {
      const m = t.match(/[\d,.]+/);
      if (m) reviewCount = parseInt(m[0].replace(/,/g, ""), 10);
    }
  });

  // Rating breakdown by star (5..1), if shown as a bar chart
  const breakdown = {};
  $("div.rev-brk-item").each((_, el) => {
    // VERIFY: per-star breakdown row
    const row = $(el);
    const starLabel = row.find("span.-fs14").text().trim();
    const count = row.find("span.-gy5").text().trim();
    if (starLabel && count) breakdown[starLabel] = count;
  });

  const sellerName = $("p.-m.-pvs.-hr._s.-oxf.-sbcnt a").first().text().trim() || null; // VERIFY
  const sellerRating = $("div.rating.-mvs").first().text().trim() || null; // VERIFY

  const stockStatus = $("p.-df.-i-ctr.-fs12").first().text().trim() || null; // VERIFY

  const categoryBreadcrumb = [];
  $("div.brcbs a").each((_, el) => {
    // VERIFY: breadcrumb links
    const t = $(el).text().trim();
    if (t) categoryBreadcrumb.push(t);
  });

  const reviews = [];
  $("article.-pvs.-hr").each((_, el) => {
    // VERIFY: each individual review block
    const rev = $(el);
    const reviewer = rev.find("p.-m.-pbs").first().text().trim() || null;
    const revRatingText = rev.find("div.stars._s").first().text();
    const revRating = revRatingText ? toFloat(revRatingText) : null;
    const revDate = rev.find("p.-pvs span").first().text().trim() || null; // VERIFY: e.g. "15-04-2026"
    const revText = rev.find("p.-pvs.-hr").first().text().trim() || null;
    const verified = /achat vérifié/i.test(rev.text());

    reviews.push({
      reviewer,
      rating: revRating,
      date: revDate,
      text: revText,
      verifiedPurchase: verified,
    });
  });

  return {
    sku,
    name,
    brand,
    price,
    oldPrice,
    rating,
    reviewCount,
    ratingBreakdown: breakdown,
    sellerName,
    sellerRating,
    stockStatus,
    categoryBreadcrumb,
    reviews,
  };
}
