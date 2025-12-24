const axios = require("axios");

const CF_BASE = "https://codeforces.com/api";

exports.getUserInfo = async (handle) => {
  const res = await axios.get(`${CF_BASE}/user.info`, {
    params: { handles: handle },
  });

  if (res.data.status !== "OK") {
    throw new Error("Invalid Codeforces handle");
  }

  return res.data.result[0];
};
