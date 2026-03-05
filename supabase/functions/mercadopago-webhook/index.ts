import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Mercado Pago webhook handler.
 * Only active when PAYMENT_PROVIDER_MODE = "mercadopago".
 * Validates payment with MP API before activating.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const providerMode = Deno.env.get("PAYMENT_PROVIDER_MODE") || "mock";
    if (providerMode !== "mercadopago") {
      return new Response(JSON.stringify({ error: "Webhook not active in current mode" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("[mp-webhook] Received:", JSON.stringify(body));

    // MP sends type=payment, data.id=payment_id
    if (body.type !== "payment" || !body.data?.id) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data.id;
    const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;

    // ALWAYS fetch payment from MP API - never trust webhook payload alone
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    if (!mpResponse.ok) {
      console.error("[mp-webhook] Failed to fetch payment from MP");
      return new Response(JSON.stringify({ error: "Failed to verify payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpResponse.json();
    console.log("[mp-webhook] Payment status:", payment.status, "amount:", payment.transaction_amount);

    // Log raw event
    const userId = payment.metadata?.user_id;

    // Validate payment
    if (payment.status !== "approved") {
      console.log("[mp-webhook] Payment not approved, status:", payment.status);
      return new Response(JSON.stringify({ received: true, status: payment.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-fraud: validate amount
    const { data: config } = await supabase
      .from("configuracoes")
      .select("plano_preco")
      .limit(1)
      .single();

    const expectedAmount = (config?.plano_preco || 15000) / 100;
    if (payment.transaction_amount !== expectedAmount) {
      console.error(`[mp-webhook] Amount mismatch: expected ${expectedAmount}, got ${payment.transaction_amount}`);
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find subscription by provider_payment_id (preference ID is in external_reference or metadata)
    const preferenceId = payment.preference_id;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("provider_payment_id", preferenceId)
      .eq("provider", "mercadopago")
      .single();

    if (!sub) {
      console.error("[mp-webhook] No subscription found for preference:", preferenceId);
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call central activation
    const activateResponse = await fetch(`${supabaseUrl}/functions/v1/activate-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        subscription_id: sub.id,
        provider_payment_id: String(paymentId),
        source: "mercadopago_webhook",
      }),
    });

    const result = await activateResponse.json();
    console.log("[mp-webhook] Activation result:", result);

    return new Response(JSON.stringify({ received: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[mp-webhook] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
