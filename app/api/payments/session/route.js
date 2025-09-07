import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get("session_id");
    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["customer", "line_items.data.price.product"],
    });

    const payload = {
      id: session.id,
      customer_email: session.customer_details?.email || session.customer_email || null,
      customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
      status: session.status,
      mode: session.mode,
      metadata: session.metadata || {},
      line_items: (session.line_items?.data || []).map((li) => ({
        description: li.description,
        qty: li.quantity,
        price_id: li.price?.id || null,
        product: li.price?.product && typeof li.price.product !== "string"
          ? { id: li.price.product.id, name: li.price.product.name }
          : null,
      })),
    };

    return new Response(JSON.stringify(payload), { status: 200 });
  } catch (err) {
    console.error("session lookup error:", err);
    return new Response(JSON.stringify({ error: err.message || "Stripe error" }), { status: 500 });
  }
}
