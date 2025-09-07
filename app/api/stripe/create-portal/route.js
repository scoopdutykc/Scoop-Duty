// app/api/stripe/create-portal/route.js
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

function normalizeSiteUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    // Strip any trailing slash; keep just protocol + host for consistency
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    // Parse JSON body safely
    const body = await req.json().catch(() => ({}));
    const email = body?.email?.trim();

    if (!process.env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Determine canonical site URL: env → request origin → hard fallback
    const envSite = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
    let originFromReq = null;
    try {
      originFromReq = normalizeSiteUrl(req.url);
    } catch {}
    const SITE_URL = envSite || originFromReq || "https://scoop-duty.com";

    // Find or create a Stripe customer by email
    let customerId;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data?.length) {
      customerId = existing.data[0].id;
    } else {
      const created = await stripe.customers.create({ email });
      customerId = created.id;
    }

    // Create Billing Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_URL}/billing`, // where Stripe sends them back
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("create-portal error:", err);
    return new Response(JSON.stringify({ error: err.message || "Stripe portal error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
