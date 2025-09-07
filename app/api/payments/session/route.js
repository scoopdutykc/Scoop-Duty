// app/api/payments/session/route.js
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // prevent static optimization on Vercel
export const revalidate = 0;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'Missing session_id' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer', 'line_items.data.price.product'],
    });

    // return only what you need
    return new Response(
      JSON.stringify({
        id: session.id,
        mode: session.mode,
        customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        customer_email: session.customer_details?.email || null,
        amount_total: session.amount_total,
        currency: session.currency,
        metadata: session.metadata || {},
        line_items: session.line_items?.data?.map((li) => ({
          price: li.price?.id,
          recurring: !!li.price?.recurring,
          product: {
            id: li.price?.product?.id || null,
            name: li.price?.product?.name || null,
          },
        })) || [],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    console.error('session lookup error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Stripe error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
