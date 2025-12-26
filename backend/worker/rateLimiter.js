let lastRequestTime = 0;
const MIN_DELAY = 250; // 4 req/sec

exports.rateLimit = async () => {
  const now = Date.now();
  const diff = now - lastRequestTime;

  if (diff < MIN_DELAY) {
    await new Promise((r) => setTimeout(r, MIN_DELAY - diff));
  }

  lastRequestTime = Date.now();
};
