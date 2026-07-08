"""
HTML parsers for jumia.ma pages.

IMPORTANT: The CSS selectors below are best-guess starting points based on the
markup pattern Jumia-family sites (jumia.ma / .ci / .eg / etc.) typically share
on their shared platform. jumia.ma changes its markup periodically without
notice, so before relying on this in production:

  1. Run `python inspect_page.py <url>` (included in this folder) to dump the
     raw HTML for a live page.
  2. Open it and confirm the actual class names / structure match what's below.
  3. Adjust selectors accordingly.

Treat every selector here as "needs verification", not "confirmed correct".
"""
from bs4 import BeautifulSoup
import re


def _text(el):
    return el.get_text(strip=True) if el else None


def _to_float(text):
    if not text:
        return None
    match = re.search(r"[\d.,]+", text.replace("\xa0", " "))
    if not match:
        return None
    return float(match.group(0).replace(",", "").replace(" ", ""))


def parse_listing_cards(html: str) -> list[dict]:
    """
    Parses a category or flash-sales listing page into a list of lightweight
    product summaries (no reviews/seller detail — that requires the product
    page itself).
    """
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("article.prd")  # VERIFY: product card container
    results = []

    for card in cards:
        link = card.select_one("a.core")  # VERIFY: main link wrapping the card
        name = _text(card.select_one("h3.name"))
        price = _to_float(_text(card.select_one("div.prc")))
        old_price = _to_float(_text(card.select_one("div.old")))  # VERIFY: strikethrough price
        discount = _text(card.select_one("div.bdg._dsct"))  # VERIFY: discount badge

        # Flash-sale-specific: stock progress bar, if present
        stock_bar = card.select_one("div.bgt")  # VERIFY: "% claimed" bar
        stock_claimed_pct = None
        if stock_bar and stock_bar.has_attr("style"):
            m = re.search(r"width:\s*(\d+)%", stock_bar["style"])
            if m:
                stock_claimed_pct = int(m.group(1))

        results.append({
            "name": name,
            "product_url": link["href"] if link and link.has_attr("href") else None,
            "price": price,
            "old_price": old_price,
            "discount_label": discount,
            "flash_sale_stock_claimed_pct": stock_claimed_pct,
        })

    return results


def parse_product_page(html: str) -> dict:
    """
    Parses a single product detail page: identity, price, rating, seller,
    stock, and — critically — the individual dated reviews, which is your
    primary demand-velocity signal.
    """
    soup = BeautifulSoup(html, "html.parser")

    sku = None
    sku_el = soup.find(string=re.compile(r"SKU", re.I))
    if sku_el:
        sku = sku_el.find_parent().get_text(strip=True).replace("SKU", "").strip(": ")

    name = _text(soup.select_one("h1.-fs20"))  # VERIFY: product title
    brand = _text(soup.select_one("a.link-to-brandstore"))  # VERIFY: brand link

    price = _to_float(_text(soup.select_one("span.-b.-ltr.-tal.-fs24")))  # VERIFY: current price
    old_price = _to_float(_text(soup.select_one("span.-tal.-gy5.-lthr")))  # VERIFY: original price

    rating_el = soup.select_one("div.stars._m._al")  # VERIFY: rating summary block
    rating = _to_float(_text(rating_el)) if rating_el else None

    review_count_el = soup.find(string=re.compile(r"avis|reviews", re.I))
    review_count = None
    if review_count_el:
        m = re.search(r"[\d,\.]+", review_count_el)
        if m:
            review_count = int(m.group(0).replace(",", ""))

    # Rating breakdown by star (5..1), if shown as a bar chart
    breakdown = {}
    for row in soup.select("div.rev-brk-item"):  # VERIFY: per-star breakdown row
        star_label = _text(row.select_one("span.-fs14"))
        count = _text(row.select_one("span.-gy5"))
        if star_label and count:
            breakdown[star_label] = count

    seller_name = _text(soup.select_one("p.-m.-pvs.-hr._s.-oxf.-sbcnt a"))  # VERIFY: seller name
    seller_rating = _text(soup.select_one("div.rating.-mvs"))  # VERIFY: seller rating

    stock_status_el = soup.select_one("p.-df.-i-ctr.-fs12")  # VERIFY: "Disponible"/out-of-stock text
    stock_status = _text(stock_status_el)

    category_breadcrumb = [
        _text(a) for a in soup.select("div.brcbs a")  # VERIFY: breadcrumb links
        if _text(a)
    ]

    reviews = []
    for rev in soup.select("article.-pvs.-hr"):  # VERIFY: each individual review block
        reviewer = _text(rev.select_one("p.-m.-pbs"))
        rev_rating_el = rev.select_one("div.stars._s")
        rev_rating = _to_float(_text(rev_rating_el)) if rev_rating_el else None
        rev_date = _text(rev.select_one("p.-pvs span"))  # VERIFY: review date text, e.g. "15-04-2026"
        rev_text = _text(rev.select_one("p.-pvs.-hr"))
        verified = bool(rev.find(string=re.compile(r"achat vérifié", re.I)))

        reviews.append({
            "reviewer": reviewer,
            "rating": rev_rating,
            "date": rev_date,
            "text": rev_text,
            "verified_purchase": verified,
        })

    return {
        "sku": sku,
        "name": name,
        "brand": brand,
        "price": price,
        "old_price": old_price,
        "rating": rating,
        "review_count": review_count,
        "rating_breakdown": breakdown,
        "seller_name": seller_name,
        "seller_rating": seller_rating,
        "stock_status": stock_status,
        "category_breadcrumb": category_breadcrumb,
        "reviews": reviews,
    }
