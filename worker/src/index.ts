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

  // Supabase admin (for magic links)
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Resend (for sending emails)
  RESEND_API_KEY: string;
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

const ALLOWED_ORIGINS = [
  "https://english-tutor-mexico.pages.dev",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
];

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
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
    const origin = request.headers.get("Origin") || ALLOWED_ORIGINS[0];

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

    // ---- POST /api/send-magic-link ----
    // Bypasses Supabase's broken SMTP by generating magic links via admin API
    // and sending them directly through Resend
    if (request.method === "POST" && url.pathname === "/api/send-magic-link") {
      try {
        const body: { email?: string; redirectTo?: string; type?: string } = await request.json();
        const { email, redirectTo, type } = body;

        if (!email) {
          return jsonResponse({ error: "Missing 'email' in request body" }, 400, origin);
        }

        // Generate magic link via Supabase admin API
        const generateLinkUrl = `${env.SUPABASE_URL}/auth/v1/admin/generate_link`;
        const generateResp = await fetch(generateLinkUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: type || "magiclink",
            email,
            redirect_to: redirectTo || `${origin}/student/callback`,
          }),
        });

        if (!generateResp.ok) {
          const errText = await generateResp.text();
          console.error("Supabase generate_link error:", generateResp.status, errText);
          return jsonResponse({ error: "Failed to generate magic link" }, 500, origin);
        }

        const linkData = await generateResp.json();
        const magicLinkUrl = linkData.action_link || linkData.properties?.action_link;

        if (!magicLinkUrl) {
          console.error("No action_link in response:", JSON.stringify(linkData));
          return jsonResponse({ error: "Failed to generate magic link URL" }, 500, origin);
        }

        // Send email via Resend
        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "English Immersion <onboarding@resend.dev>",
            to: email,
            subject: "🔗 Your magic link to sign in",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #6366f1;">Sign in to English Immersion</h2>
                <p>Click the button below to sign in. This link expires in 1 hour.</p>
                <a href="${magicLinkUrl}"
                   style="display: inline-block; padding: 12px 24px; background: #6366f1;
                          color: white; text-decoration: none; border-radius: 8px;
                          font-weight: bold; margin: 16px 0;">
                  Sign In →
                </a>
                <p style="color: #64748b; font-size: 14px;">
                  Or copy this link:<br>
                  <code style="word-break: break-all;">${magicLinkUrl}</code>
                </p>
                <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
                  If you didn't request this, ignore this email.
                </p>
              </div>
            `,
          }),
        });

        if (!resendResp.ok) {
          const errText = await resendResp.text();
          console.error("Resend error:", resendResp.status, errText);
          return jsonResponse({ error: "Failed to send email" }, 500, origin);
        }

        return jsonResponse({ success: true }, 200, origin);
      } catch (err) {
        console.error("Magic link error:", err);
        return jsonResponse({ error: "Failed to send magic link" }, 500, origin);
      }
    }

    // ---- 404 ----
    return jsonResponse({ error: "Not found" }, 404, origin);
  },
};
