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

    const now = new Date().toISOString();

    // Find active subscriptions past renewal date
    const { data: expired, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, credits_total")
      .eq("status", "active")
      .lt("renewal_date", now);

    if (error) {
      console.error("[expire-subscriptions] Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[expire-subscriptions] Found ${expired?.length || 0} expired subscriptions`);

    let expiredCount = 0;
    for (const sub of expired || []) {
      const { error: updateErr } = await supabase
        .from("subscriptions")
        .update({
          status: "expired",
          credits_available: 0,
          updated_at: now,
        })
        .eq("id", sub.id);

      if (updateErr) {
        console.error(`[expire-subscriptions] Failed to expire ${sub.id}:`, updateErr);
        continue;
      }

      // Notify user
      await supabase.from("notifications").insert({
        user_id: sub.user_id,
        title: "⏰ Plano expirado",
        body: "Seu plano premium venceu. Renove para continuar aproveitando os benefícios!",
        type: "subscription_expired",
      });

      expiredCount++;
      console.log(`[expire-subscriptions] Expired subscription ${sub.id} for user ${sub.user_id}`);
    }

    return new Response(
      JSON.stringify({ success: true, expired: expiredCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[expire-subscriptions] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
