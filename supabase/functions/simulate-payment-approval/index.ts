import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DEV-ONLY: Simulates a payment approval for mock provider subscriptions.
 * Calls the central activate-subscription function internally.
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
    if (providerMode !== "mock") {
      return new Response(
        JSON.stringify({ error: "Simulation only available in mock mode" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subscription_id } = await req.json();
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "subscription_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify subscription exists and is mock provider
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("id, provider, status")
      .eq("id", subscription_id)
      .single();

    if (error || !sub) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sub.provider !== "mock") {
      return new Response(
        JSON.stringify({ error: "Can only simulate mock provider subscriptions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (sub.status !== "pending_payment") {
      return new Response(
        JSON.stringify({ error: "Subscription is not pending payment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call activate-subscription internally
    const activateResponse = await fetch(`${supabaseUrl}/functions/v1/activate-subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        subscription_id,
        provider_payment_id: `mock_approved_${crypto.randomUUID()}`,
        source: "mock_simulation",
      }),
    });

    const result = await activateResponse.json();

    return new Response(JSON.stringify(result), {
      status: activateResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[simulate] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
