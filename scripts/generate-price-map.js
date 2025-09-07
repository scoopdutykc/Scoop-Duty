// scripts/generate-price-map.js
// Usage: node scripts/generate-price-map.js ./prices.csv
//
// Requires: npm i csv-parse
//
// Outputs:
//   app/checkout/priceMap.json      -> { PRICE_MAP, FALLBACK_PRICE_BY_SERVICE }
//   app/checkout/priceAmounts.json  -> { [priceId]: { amount, currency, interval, interval_count } }

const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

function normFreq(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/once weekly/g, "weekly")
    .replace(/one[-\s]?time/g, "onetime")
    .replace(/twice weekly/g, "twice_weekly")
    .replace(/(three|thrice) weekly/g, "thrice_weekly");
}

function intOrPlus(token) {
  const t = String(token || "").toLowerCase();
  const m = t.match(/(\d+)/);
  if (!m) return "";
  const n = m[1];
  return t.includes("+") ? `${n}+` : n;
}

function serviceKey(productName) {
  const s = String(productName || "").toLowerCase();
  if (s.includes("scoop")) return "scooping";
  if (s.includes("play")) return "playtime";
  if (s.includes("litter")) return "litter";
  return null;
}

function buildPriceMapAndAmounts(rows) {
  const PRICE_MAP = { scooping: {}, playtime: {}, litter: {} };
  const PRICE_AMOUNTS = {}; // priceId -> { amount, currency, interval, interval_count }

  for (const row of rows) {
    const product = row["Product Name"]?.trim();
    const desc = row["Description"]?.trim();
    const priceId = row["Price ID"]?.trim();
    if (!product || !desc || !priceId) continue;

    // Save amount info for estimates
    const amount = typeof row["Amount"] === "number"
      ? row["Amount"]
      : Number(String(row["Amount"] || "").replace(/[^0-9.]/g, "")) || null;

    PRICE_AMOUNTS[priceId] = {
      amount, // dollars as exported by Stripe CSV
      currency: row["Currency"] || "usd",
      interval: (row["Interval"] || "").toLowerCase() || null,
      interval_count: Number(row["Interval Count"] || "") || null,
    };

    const service = serviceKey(product);
    if (!service) continue;

    const parts = desc.split(",").map((p) => p.trim()).filter(Boolean);
    const freq = normFreq(parts[0] || "");
    if (!freq) continue;

    if (service === "scooping") {
      let pets = "";
      let size = "";
      for (const p of parts.slice(1)) {
        const pl = p.toLowerCase();
        if (pl.includes("dog")) pets = intOrPlus(pl);
        if (pl.includes("yard")) {
          if (pl.includes("small")) size = "small";
          else if (pl.includes("medium")) size = "medium";
          else if (pl.includes("large")) size = "large";
        }
      }
      if (!pets && freq === "onetime") {
        // allow global onetime
        PRICE_MAP.scooping[freq] = priceId;
        continue;
      }
      if (!pets || !size) continue;
      PRICE_MAP.scooping[freq] ??= {};
      PRICE_MAP.scooping[freq][size] ??= {};
      PRICE_MAP.scooping[freq][size][pets] = priceId;

    } else if (service === "playtime") {
      let pets = "";
      for (const p of parts.slice(1)) {
        if (p.toLowerCase().includes("dog")) pets = intOrPlus(p);
      }
      if (!pets && freq === "onetime") {
        PRICE_MAP.playtime[freq] = priceId;
        continue;
      }
      if (!pets) continue;
      PRICE_MAP.playtime[freq] ??= {};
      PRICE_MAP.playtime[freq][pets] = priceId;

    } else if (service === "litter") {
      let boxes = "";
      for (const p of parts.slice(1)) {
        if (p.toLowerCase().includes("box")) boxes = intOrPlus(p);
      }
      if (!boxes && freq === "onetime") {
        PRICE_MAP.litter[freq] = priceId;
        continue;
      }
      if (!boxes) continue;
      PRICE_MAP.litter[freq] ??= {};
      PRICE_MAP.litter[freq][boxes] = priceId;
    }
  }

  // Fallbacks
  const FALLBACK_PRICE_BY_SERVICE = { scooping: null, playtime: null, litter: null };

  const s = PRICE_MAP.scooping;
  if (s.weekly?.small?.["1"]) FALLBACK_PRICE_BY_SERVICE.scooping = s.weekly.small["1"];
  else {
    outer: for (const f of Object.keys(s)) {
      for (const size of Object.keys(s[f] || {})) {
        for (const pets of Object.keys(s[f][size] || {})) {
          FALLBACK_PRICE_BY_SERVICE.scooping = s[f][size][pets];
          break outer;
        }
      }
    }
  }

  const p = PRICE_MAP.playtime;
  if (p.weekly?.["1"]) FALLBACK_PRICE_BY_SERVICE.playtime = p.weekly["1"];
  else {
    outer2: for (const f of Object.keys(p)) {
      for (const k of Object.keys(p[f] || {})) {
        FALLBACK_PRICE_BY_SERVICE.playtime = p[f][k];
        break outer2;
      }
    }
  }

  const l = PRICE_MAP.litter;
  if (l.weekly?.["1"]) FALLBACK_PRICE_BY_SERVICE.litter = l.weekly["1"];
  else {
    outer3: for (const f of Object.keys(l)) {
      for (const k of Object.keys(l[f] || {})) {
        FALLBACK_PRICE_BY_SERVICE.litter = l[f][k];
        break outer3;
      }
    }
  }

  return { PRICE_MAP, FALLBACK_PRICE_BY_SERVICE, PRICE_AMOUNTS };
}

(function main() {
  const csvPath = process.argv[2] || "./prices.csv";
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at ${csvPath}. Place prices.csv at project root or pass a path.`);
    process.exit(1);
  }
  const rows = parse(fs.readFileSync(csvPath), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const out = buildPriceMapAndAmounts(rows);

  const outDir = path.join(process.cwd(), "app", "checkout");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "priceMap.json"), JSON.stringify({
    PRICE_MAP: out.PRICE_MAP,
    FALLBACK_PRICE_BY_SERVICE: out.FALLBACK_PRICE_BY_SERVICE,
  }, null, 2));

  fs.writeFileSync(path.join(outDir, "priceAmounts.json"), JSON.stringify(out.PRICE_AMOUNTS, null, 2));

  console.log("✅ Wrote app/checkout/priceMap.json and app/checkout/priceAmounts.json");
})();
