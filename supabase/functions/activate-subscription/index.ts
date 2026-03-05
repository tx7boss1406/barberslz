import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Central activation function.
 * Called by: mock simulation, Mercado Pago webhook, renewal webhook.
 * Single source of truth for activating a subscription.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { subscription_id, provider_payment_id, source } = await req.json();

    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "subscription_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch subscription
    const { data: sub, error: fetchErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .single();

    if (fetchErr || !sub) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent double activation
    if (sub.status === "active") {
      return new Response(JSON.stringify({ message: "Already active", subscription_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const renewalDate = new Date(Date.now() + 30 * 86400000).toISOString();

    // Activate subscription
    const { error: updateErr } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        credits_available: sub.credits_total,
        credits_used: 0,
        start_date: now,
        renewal_date: renewalDate,
        provider_payment_id: provider_payment_id || sub.provider_payment_id,
        updated_at: now,
      })
      .eq("id", subscription_id);

    if (updateErr) {
      console.error("[activate] Update error:", updateErr);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log event
    await supabase.from("subscription_events").insert({
      subscription_id,
      event_type: "payment_approved",
      payload: {
        source: source || "unknown",
        provider_payment_id: provider_payment_id || null,
        credits_released: sub.credits_total,
        renewal_date: renewalDate,
      },
    });

    // Notify user
    await supabase.from("notifications").insert({
      user_id: sub.user_id,
      title: "👑 Plano Premium Ativado!",
      body: `Seu plano foi ativado! Você tem ${sub.credits_total} créditos disponíveis.`,
      type: "subscription",
    });

    console.log(`[activate] Subscription ${subscription_id} activated for user ${sub.user_id}`);

    return new Response(
      JSON.stringify({ success: true, subscription_id, status: "active" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[activate] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
