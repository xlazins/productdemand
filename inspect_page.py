"""
Usage: python inspect_page.py <url> [output.html]

Fetches a single jumia.ma page and saves the raw HTML so you can open it and
confirm the real CSS class names before trusting parsers.py's selectors.
Run this FIRST, on a flash-sale page and on a product page, before running
the main scraper for real.
"""
import sys
from client import JumiaClient

def main():
    if len(sys.argv) < 2:
        print("Usage: python inspect_page.py <url> [output.html]")
        sys.exit(1)

    url = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else "page_dump.html"

    client = JumiaClient()
    resp = client.get(url)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(resp.text)

    print(f"Saved {len(resp.text)} chars to {out_path}")
    print("Open it in a browser or editor, inspect the real markup, "
          "and update parsers.py selectors to match.")

if __name__ == "__main__":
    main()
