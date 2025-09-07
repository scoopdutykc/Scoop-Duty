import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("session_id");
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing session id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ["customer"],
    });

    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("session lookup error:", err);
    return new Response(JSON.stringify({ error: err.message || "Stripe error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
