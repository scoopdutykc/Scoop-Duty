// app/api/stripe/create-invoice/route.js
import Stripe from "stripe";

export async function POST(req) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY env var" }), { status: 500 });
    }

    const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

    // Get email from JSON body OR x-user-email header
    let email = null;
    try {
      if ((req.headers.get("content-type") || "").includes("application/json")) {
        const body = await req.json();
        email = body?.email || null;
      }
    } catch { /* ignore parse errors */ }
    if (!email) email = req.headers.get("x-user-email");

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email (body.email or x-user-email header)" }), { status: 400 });
    }

    // Find or create a Stripe customer by email
    let customerId;
    try {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({ email, metadata: { source: "portal" } });
        customerId = created.id;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `Customer lookup/create failed: ${e?.message || e}` }), { status: 500 });
    }

    const origin = new URL(req.url).origin;
    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || `${origin}/`;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        // Optional: pass a specific configuration if you use one
        // configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
      });
      return new Response(JSON.stringify({ url: session.url }), { status: 200 });
    } catch (e) {
      // Surface full Stripe error so you can see what’s wrong
      const detail = e?.raw?.message || e?.message || String(e);
      return new Response(JSON.stringify({ error: `Portal session failed: ${detail}` }), { status: 500 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: `Unexpected server error: ${e?.message || e}` }), { status: 500 });
  }
}
