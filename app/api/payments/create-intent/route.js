import Stripe from "stripe";

export async function POST(req) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500 });
    }
    const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

    const { amount, currency = "usd", metadata = {} } = await req.json();
    if (!amount || typeof amount !== "number" || amount < 50) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400 });
    }

    const intent = await stripe.paymentIntents.create({
      amount,                 // cents
      currency,
      metadata,               // service/options/email
      automatic_payment_methods: { enabled: true },
    });

    return new Response(JSON.stringify({ clientSecret: intent.client_secret, id: intent.id }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Failed to create PaymentIntent" }), { status: 500 });
  }
}
