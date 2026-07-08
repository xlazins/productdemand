"""
Rate-limited HTTP client for jumia.ma, identified as a bot per their robots.txt
(bot must self-identify + stay under 200 req/min).
"""
import time
import requests

BOT_NAME = "SouqRadarBot/1.0"
CONTACT_URL = "https://souqradar.ma/bot-info"  # replace with your real bot-info page

HEADERS = {
    "User-Agent": f"{BOT_NAME} (+{CONTACT_URL})",
    "Accept-Language": "fr-MA,fr;q=0.9,ar;q=0.8",
}

# Stay comfortably under the 200 req/min ceiling in robots.txt
REQUESTS_PER_MINUTE = 120
MIN_DELAY = 60 / REQUESTS_PER_MINUTE  # ~0.5s between requests

MAX_RETRIES = 3
BACKOFF_BASE = 2  # seconds, doubles each retry


class JumiaClient:
    def __init__(self, requests_per_minute: int = REQUESTS_PER_MINUTE):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.min_delay = 60 / requests_per_minute
        self._last_request_time = 0.0

    def _throttle(self):
        elapsed = time.time() - self._last_request_time
        wait = self.min_delay - elapsed
        if wait > 0:
            time.sleep(wait)

    def get(self, url: str, **kwargs) -> requests.Response:
        last_exc = None
        for attempt in range(MAX_RETRIES):
            self._throttle()
            try:
                resp = self.session.get(url, timeout=15, **kwargs)
                self._last_request_time = time.time()
                if resp.status_code == 200:
                    return resp
                if resp.status_code == 429:
                    # Being told to slow down — back off harder than usual
                    wait = BACKOFF_BASE * (attempt + 2)
                    print(f"[429] rate limited on {url}, waiting {wait}s")
                    time.sleep(wait)
                    continue
                if resp.status_code >= 500:
                    wait = BACKOFF_BASE * (attempt + 1)
                    print(f"[{resp.status_code}] server error on {url}, retrying in {wait}s")
                    time.sleep(wait)
                    continue
                # 404 etc — no point retrying
                resp.raise_for_status()
            except requests.RequestException as exc:
                last_exc = exc
                wait = BACKOFF_BASE * (attempt + 1)
                print(f"[error] {exc} on {url}, retrying in {wait}s")
                time.sleep(wait)
        raise RuntimeError(f"Failed to fetch {url} after {MAX_RETRIES} attempts") from last_exc
