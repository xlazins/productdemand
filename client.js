/**
 * Rate-limited HTTP client for jumia.ma, identified as a bot per their
 * robots.txt (bot must self-identify + stay under 200 req/min).
 */
import axios from "axios";

const BOT_NAME = "SouqRadarBot/1.0";
const CONTACT_URL = "https://souqradar.ma/bot-info"; // replace with your real bot-info page

const HEADERS = {
  "User-Agent": `${BOT_NAME} (+${CONTACT_URL})`,
  "Accept-Language": "fr-MA,fr;q=0.9,ar;q=0.8",
};

// Stay comfortably under the 200 req/min ceiling in robots.txt
const REQUESTS_PER_MINUTE = 120;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000; // doubles-ish each retry

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class JumiaClient {
  constructor(requestsPerMinute = REQUESTS_PER_MINUTE) {
    this.minDelayMs = 60000 / requestsPerMinute;
    this.lastRequestTime = 0;
    this.axios = axios.create({ headers: HEADERS, timeout: 15000 });
  }

  async _throttle() {
    const elapsed = Date.now() - this.lastRequestTime;
    const wait = this.minDelayMs - elapsed;
    if (wait > 0) await sleep(wait);
  }

  async get(url) {
    let lastErr;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await this._throttle();
      try {
        const resp = await this.axios.get(url, { validateStatus: () => true });
        this.lastRequestTime = Date.now();

        if (resp.status === 200) return resp;

        if (resp.status === 429) {
          const wait = BACKOFF_BASE_MS * (attempt + 2);
          console.log(`[429] rate limited on ${url}, waiting ${wait}ms`);
          await sleep(wait);
          continue;
        }

        if (resp.status >= 500) {
          const wait = BACKOFF_BASE_MS * (attempt + 1);
          console.log(`[${resp.status}] server error on ${url}, retrying in ${wait}ms`);
          await sleep(wait);
          continue;
        }

        // 404 etc — no point retrying
        throw new Error(`HTTP ${resp.status} on ${url}`);
      } catch (err) {
        lastErr = err;
        const wait = BACKOFF_BASE_MS * (attempt + 1);
        console.log(`[error] ${err.message} on ${url}, retrying in ${wait}ms`);
        await sleep(wait);
      }
    }
    throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} attempts: ${lastErr?.message}`);
  }
}
