/**
 * Usage: node inspectPage.js <url> [output.html]
 *
 * Fetches a single jumia.ma page and saves the raw HTML so you can open it
 * and confirm the real CSS class names before trusting parsers.js's
 * selectors. Run this FIRST, on a flash-sale page and on a product page,
 * before running the main scraper for real.
 */
import fs from "fs";
import { JumiaClient } from "./client.js";

async function main() {
  const [, , url, outArg] = process.argv;
  if (!url) {
    console.log("Usage: node inspectPage.js <url> [output.html]");
    process.exit(1);
  }
  const outPath = outArg || "page_dump.html";

  const client = new JumiaClient();
  const resp = await client.get(url);

  fs.writeFileSync(outPath, resp.data, "utf-8");
  console.log(`Saved ${resp.data.length} chars to ${outPath}`);
  console.log(
    "Open it in a browser or editor, inspect the real markup, and update parsers.js selectors to match."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
