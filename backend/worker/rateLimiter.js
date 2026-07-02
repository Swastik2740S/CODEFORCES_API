// Serialized rate limiter for Codeforces API calls.
//
// CF enforces ~5 req/sec per IP and starts resetting connections well below
// that on many networks. We stay conservative at 1 request per MIN_DELAY ms.
//
// Callers are chained on a single promise, so concurrent calls queue up and
// each gets its own MIN_DELAY slot — the old implementation let concurrent
// callers read the same `lastRequestTime` and burst through together.
//
// NOTE: this limiter is per-process. Only the worker process should talk to
// Codeforces (see codeforces.controller.js — handle verification is the one
// deliberate exception, budgeted at a single user.info call per link).

const MIN_DELAY = 400; // ~2.5 req/sec, safety margin under CF's limit

let chain = Promise.resolve();
let lastRequestTime = 0;

exports.rateLimit = () => {
  const slot = chain.then(async () => {
    const wait = lastRequestTime + MIN_DELAY - Date.now();
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    lastRequestTime = Date.now();
  });
  // keep the chain alive even if a caller's slot rejects (it never should)
  chain = slot.catch(() => {});
  return slot;
};
