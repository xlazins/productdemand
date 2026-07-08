import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), "scrape_output", "flash_sales_listing.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const products = JSON.parse(raw);
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: "Could not load products", detail: err.message });
  }
}
