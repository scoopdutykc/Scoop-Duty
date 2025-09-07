import Stripe from "stripe";

export async function POST(req) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500 });
    }
    const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

    const { payment_intent_id } = await req.json();
    if (!payment_intent_id) {
      return new Response(JSON.stringify({ error: "Missing payment_intent_id" }), { status: 400 });
    }

    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    return new Response(
      JSON.stringify({
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
        metadata: pi.metadata || {},
      }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Verify failed" }), { status: 500 });
  }
}
