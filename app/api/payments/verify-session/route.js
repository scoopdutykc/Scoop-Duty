import Stripe from "stripe";

export async function POST(req) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500 });
    }
    const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"],
    });

    // Consider "paid" a success; you can also check subscription.status === 'active' or 'trialing'
    const ok = session.payment_status === "paid";
    return new Response(
      JSON.stringify({
        ok,
        payment_status: session.payment_status,
        session_status: session.status,
        customer_email: session.customer_details?.email || session.customer?.email || null,
        subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id || null,
      }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Verify session failed" }), { status: 500 });
  }
}
