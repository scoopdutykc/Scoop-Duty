// app/api/payments/create-session/route.js
import Stripe from "stripe";
import priceData from "../../../checkout/priceMap.json"; // { PRICE_MAP, FALLBACK_PRICE_BY_SERVICE }

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const { PRICE_MAP, FALLBACK_PRICE_BY_SERVICE } = priceData;

// One-time prices per service (flat, ignores other options)
const ONETIME_OVERRIDE = {
  scooping: "price_1S4SQLRzSCSZiE1R6YBer4cZ",
  playtime: "price_1S4SPURzSCSZiE1RrLUYru5Z",
  litter:   "price_1S4SP8RzSCSZiE1RGHuQugOG",
};

function normalizeSiteUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    // strip trailing slash for consistency
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

// Same resolver logic you have on the homepage
function resolvePriceId({ service, frequency, yardSize, pets, litterBoxes }) {
  const svcKey  = String(service || "").toLowerCase();
  const freqKey = String(frequency || "").toLowerCase()
    .replace(/once weekly/g, "weekly")
    .replace(/one[-\s]?time/g, "onetime")
    .replace(/twice weekly/g, "twice_weekly")
    .replace(/(three|thrice) weekly/g, "thrice_weekly");

  const sizeKey  = String(yardSize || "").toLowerCase();
  const petsKey  = String(pets || "1");
  const boxesKey = String(litterBoxes || "1");

  const svc = PRICE_MAP?.[svcKey];

  // 1) One-time => single price per service
  if (freqKey === "onetime") {
    if (ONETIME_OVERRIDE[svcKey]) return ONETIME_OVERRIDE[svcKey];
    const pmOnetime = svc?.onetime;
    if (typeof pmOnetime === "string") return pmOnetime;
    if (pmOnetime && typeof pmOnetime === "object") {
      const lvl1 = Object.values(pmOnetime)[0];
      if (typeof lvl1 === "string") return lvl1;
      if (lvl1 && typeof lvl1 === "object") {
        const leaf = Object.values(lvl1)[0];
        if (typeof leaf === "string") return leaf;
      }
    }
    return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }

  // 2) Litter: frequency -> boxes -> (maybe pets) -> priceId
  if (svcKey === "litter") {
    const byFreq = svc?.[freqKey];
    if (!byFreq) return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    const byBoxes = byFreq?.[boxesKey];
    if (typeof byBoxes === "string") return byBoxes;
    if (byBoxes && typeof byBoxes === "object") {
      return byBoxes?.[petsKey] || FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    }
    return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }

  // 3) Playtime: frequency -> pets -> (maybe size) -> priceId
  if (svcKey === "playtime") {
    const byFreq = svc?.[freqKey];
    if (!byFreq) return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    const byPets = byFreq?.[petsKey];
    if (typeof byPets === "string") return byPets;
    if (byPets && typeof byPets === "object") {
      return byPets?.[sizeKey] || FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
    }
    return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }

  // 4) Scooping: frequency -> yardSize -> pets
  const byFreq = svc?.[freqKey];
  if (!byFreq) return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  const bySize = byFreq?.[sizeKey];
  if (typeof bySize === "string") return bySize;
  if (bySize && typeof bySize === "object") {
    return bySize?.[petsKey] || FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
  }
  return FALLBACK_PRICE_BY_SERVICE?.[svcKey] || null;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      priceId,                 // optional (direct)
      service, frequency,      // or resolve from options
      yardSize, pets, litterBoxes,
      customerEmail,
      metadata = {},
    } = body || {};

    if (!process.env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500 });
    }

    // If priceId not provided, resolve from service/options
    if (!priceId && service) {
      priceId = resolvePriceId({ service, frequency, yardSize, pets, litterBoxes });
    }

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing priceId" }), { status: 400 });
    }

    // Determine canonical site URL (env → request origin → hard fallback)
    const envSite = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
    let originFromReq = null;
    try {
      originFromReq = normalizeSiteUrl(req.url);
    } catch {}
    const SITE_URL = envSite || originFromReq || "https://scoop-duty.com";

    const success_url = `${SITE_URL}/intake?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${SITE_URL}/checkout?canceled=1`;

    // Find/create customer by email (optional)
    let customerId;
    if (customerEmail) {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
      if (existing.data?.length) customerId = existing.data[0].id;
      else customerId = (await stripe.customers.create({ email: customerEmail })).id;
    }

    // Detect payment mode based on the Price object
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const isRecurring = !!price.recurring;
    const freqHint =
      String(frequency || "")
        .toLowerCase()
        .replace(/one[-\s]?time/, "onetime") === "onetime";
    const mode = isRecurring && !freqHint ? "subscription" : "payment";

    // Merge metadata so intake can show exactly what was purchased
    const finalMetadata = {
      service: service || metadata.service || "",
      frequency: frequency || metadata.frequency || "",
      yardSize: yardSize || metadata.yardSize || "",
      pets: pets || metadata.pets || "",
      litterBoxes: litterBoxes || metadata.litterBoxes || "",
      ...metadata,
    };

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : customerEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      metadata: finalMetadata,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err) {
    console.error("create-session error:", err);
    return new Response(JSON.stringify({ error: err.message || "Stripe error" }), { status: 500 });
  }
}
