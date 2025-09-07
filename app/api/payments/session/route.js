// app/api/payments/session/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get("session_id");

    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items.data.price.product", "customer"],
    });

    return new Response(JSON.stringify({ session }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Session lookup error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
