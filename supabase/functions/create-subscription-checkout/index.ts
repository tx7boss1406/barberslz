import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing active/pending subscription
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["active", "pending_payment"])
      .limit(1);

    if (existing?.length) {
      return new Response(JSON.stringify({ error: "Você já possui um plano ativo ou pendente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan config
    const { data: config } = await supabase
      .from("configuracoes")
      .select("plano_preco, plano_creditos, plano_nome")
      .limit(1)
      .single();

    const priceCents = config?.plano_preco || 15000;
    const credits = config?.plano_creditos || 5;

    // Determine provider mode
    const providerMode = Deno.env.get("PAYMENT_PROVIDER_MODE") || "mock";

    let providerPaymentId: string | null = null;
    let checkoutUrl: string | null = null;

    if (providerMode === "mock") {
      // Mock provider: no external calls
      providerPaymentId = `mock_${crypto.randomUUID()}`;
      checkoutUrl = null;
    } else if (providerMode === "mercadopago") {
      // Mercado Pago provider - requires MERCADO_PAGO_ACCESS_TOKEN
      const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
      if (!mpToken) {
        return new Response(JSON.stringify({ error: "Payment provider not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpToken}`,
        },
        body: JSON.stringify({
          items: [{
            title: config?.plano_nome || "Plano Premium Mensal",
            quantity: 1,
            unit_price: priceCents / 100,
            currency_id: "BRL",
          }],
          metadata: { user_id: user.id },
          back_urls: {
            success: `${req.headers.get("origin")}/plano?status=success`,
            failure: `${req.headers.get("origin")}/plano?status=failure`,
            pending: `${req.headers.get("origin")}/plano?status=pending`,
          },
          auto_return: "approved",
        }),
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        console.error("[checkout] MP error:", mpData);
        return new Response(JSON.stringify({ error: "Payment provider error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      providerPaymentId = mpData.id;
      checkoutUrl = mpData.init_point;
    } else {
      return new Response(JSON.stringify({ error: "Invalid payment provider mode" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create subscription record
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_type: "monthly_premium",
        price: priceCents,
        credits_total: credits,
        credits_used: 0,
        credits_available: 0, // Only unlocked after payment
        status: "pending_payment",
        provider: providerMode,
        provider_payment_id: providerPaymentId,
      })
      .select()
      .single();

    if (subError) {
      console.error("[checkout] Sub creation error:", subError);
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log event
    await supabase.from("subscription_events").insert({
      subscription_id: sub.id,
      event_type: "payment_created",
      payload: { provider: providerMode, provider_payment_id: providerPaymentId },
    });

    return new Response(
      JSON.stringify({
        subscription_id: sub.id,
        provider: providerMode,
        checkout_url: checkoutUrl,
        status: "pending_payment",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[checkout] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
