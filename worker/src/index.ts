/**
 * Cloudflare Worker — Stripe Checkout Backend
 *
 * Endpoints:
 *   POST /api/create-checkout-session — Creates a Stripe Checkout session
 *   POST /api/webhook                  — Handles Stripe webhook events
 *   GET  /api/prices                   — Returns available prices
 */

import Stripe from "stripe";

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  CORS_ORIGIN: string;

  // Price IDs (set via wrangler secret)
  SINGLE_PRICE_ID: string;
  PACK10_PRICE_ID: string;
}

// Price metadata for the GET /api/prices endpoint
interface PriceInfo {
  plan: string;
  label: string;
  amount: number;
  currency: string;
}

const PRICE_CATALOG: PriceInfo[] = [
  { plan: "single", label: "Single Lesson", amount: 40000, currency: "mxn" },
  { plan: "pack10", label: "10-Lesson Pack", amount: 300000, currency: "mxn" },
];

// ---- Helpers ----

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(data: unknown, status = 200, origin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

// ---- Request handler ----

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.CORS_ORIGIN || "*";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }

    // ---- GET /api/prices ----
    if (request.method === "GET" && url.pathname === "/api/prices") {
      return jsonResponse({ prices: PRICE_CATALOG }, 200, origin);
    }

    // ---- POST /api/create-checkout-session ----
    if (request.method === "POST" && url.pathname === "/api/create-checkout-session") {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-02-24.acacia",
          httpClient: Stripe.createFetchHttpClient(),
        });

        const body: { plan?: string } = await request.json();
        const { plan } = body;

        if (!plan) {
          return jsonResponse({ error: "Missing 'plan' in request body" }, 400, origin);
        }

        const priceId = plan === "pack10" ? env.PACK10_PRICE_ID : env.SINGLE_PRICE_ID;

        if (!priceId) {
          return jsonResponse({ error: `No price found for plan="${plan}"` }, 400, origin);
        }

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/gracias`,
          cancel_url: `${origin}/book`,
          locale: "es",
          metadata: {
            tutor: "mauricio",
            plan,
          },
        });

        return jsonResponse({ url: session.url }, 200, origin);
      } catch (err) {
        console.error("Checkout session error:", err);
        return jsonResponse({ error: "Failed to create checkout session" }, 500, origin);
      }
    }

    // ---- POST /api/webhook ----
    if (request.method === "POST" && url.pathname === "/api/webhook") {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2025-02-24.acacia",
          httpClient: Stripe.createFetchHttpClient(),
        });

        const signature = request.headers.get("Stripe-Signature");
        if (!signature) {
          return jsonResponse({ error: "Missing Stripe-Signature header" }, 400, origin);
        }

        const body = await request.text();
        const event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          env.STRIPE_WEBHOOK_SECRET,
        );

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const email = session.customer_details?.email;
            const plan = session.metadata?.plan;

            console.log(`✅ Payment completed — ${email} | Plan: ${plan}`);

            // TODO: Send confirmation email, notify you, etc.
            break;
          }

          case "checkout.session.expired": {
            console.log("⏰ Checkout session expired:", event.data.object.id);
            break;
          }
        }

        return jsonResponse({ received: true }, 200, origin);
      } catch (err) {
        console.error("Webhook error:", err);
        return jsonResponse({ error: "Webhook signature verification failed" }, 401, origin);
      }
    }

    // ---- 404 ----
    return jsonResponse({ error: "Not found" }, 404, origin);
  },
};
