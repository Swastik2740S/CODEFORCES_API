const axios = require("axios");
const { rateLimit } = require("../worker/rateLimiter");

const CF_BASE = "https://codeforces.com/api";

async function cfRequest(endpoint, params) {
  await rateLimit();
  const res = await axios.get(`${CF_BASE}/${endpoint}`, { params });

  if (res.data.status !== "OK") {
    throw new Error("Codeforces API error");
  }

  return res.data.result;
}

exports.getUserInfo = (handle) =>
  cfRequest("user.info", { handles: handle }).then(r => r[0]);

exports.getUserRating = (handle) =>
  cfRequest("user.rating", { handle });

exports.getUserSubmissions = async (handle, from = 1, count = 1000) => {
  return cfRequest("user.status", {
    handle,
    from,
    count,
  });
};

