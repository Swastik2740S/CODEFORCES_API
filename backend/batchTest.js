import axios from "axios";

// ===== CONFIG =====
const BATCH_TIME_MS = 1000;

// ===== INTERNAL STATE =====
let handleSet = new Set();
let waiting = new Map(); // handle -> [resolve callbacks]
let timer = null;

// ===== MAIN FUNCTION =====
function getUser(handle) {
  return new Promise((resolve, reject) => {
    handleSet.add(handle);

    if (!waiting.has(handle)) {
      waiting.set(handle, []);
    }
    waiting.get(handle).push(resolve);

    if (!timer) {
      timer = setTimeout(processBatch, BATCH_TIME_MS);
    }
  });
}

// ===== BATCH PROCESSOR =====
async function processBatch() {
  const handles = Array.from(handleSet);
  handleSet.clear();
  timer = null;

  console.log("📦 Sending batch request:", handles);

  try {
    const res = await axios.get(
      "https://codeforces.com/api/user.info",
      {
        params: {
          handles: handles.join(";")
        }
      }
    );

    if (res.data.status !== "OK") {
      throw new Error(res.data.comment);
    }

    for (const user of res.data.result) {
      const callbacks = waiting.get(user.handle) || [];
      callbacks.forEach(cb => cb(user));
      waiting.delete(user.handle);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

// ===== TEST =====
async function test() {
  const p1 = getUser("tourist");
  const p2 = getUser("Petr");
  const p3 = getUser("tourist"); // duplicate on purpose

  const users = await Promise.all([p1, p2, p3]);

  console.log("\n✅ Results:");
  users.forEach(u => {
    console.log(`${u.handle} → rating ${u.rating}`);
  });
}

test();
