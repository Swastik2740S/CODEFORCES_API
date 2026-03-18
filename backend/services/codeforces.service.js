const { rateLimit } = require("../worker/rateLimiter");

const CF_BASE = "https://codeforces.com/api";

const MAX_RETRIES = 4;
const RETRY_DELAYS = [2000, 4000, 8000, 15000];
const REQUEST_TIMEOUT = 20000;

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function cfRequest(endpoint, params) {
  const query = new URLSearchParams(params).toString();
  const url = `${CF_BASE}/${endpoint}?${query}`;

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await rateLimit();

      const res = await fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
        },
        REQUEST_TIMEOUT
      );

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }

      const data = await res.json();

      if (data.status !== "OK") {
        throw new Error(`Codeforces API error: ${data.comment ?? "Unknown"}`);
      }

      return data.result;

    } catch (err) {
      lastError = err;

      const isRetryable =
        err.name === "AbortError"   ||
        err.name === "TypeError"    ||
        err.code === "ECONNRESET"   ||
        err.code === "ETIMEDOUT"    ||
        err.code === "ECONNREFUSED" ||
        err.code === "ENOTFOUND"    ||
        err.status === 503          ||
        err.status === 429;

      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error(`❌ CF API [${endpoint}] failed after ${attempt + 1} attempt(s): ${err.message}`);
        throw lastError;
      }

      const delay = RETRY_DELAYS[attempt];
      console.warn(
        `⚠️  CF API [${endpoint}] attempt ${attempt + 1} failed (${err.name ?? err.code ?? err.message}). Retrying in ${delay / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

exports.getUserInfo = (handle) =>
  cfRequest("user.info", { handles: handle }).then((r) => r[0]);

exports.getUserRating = (handle) =>
  cfRequest("user.rating", { handle });

exports.getUserSubmissions = (handle, from = 1, count = 200) =>
  cfRequest("user.status", { handle, from, count });