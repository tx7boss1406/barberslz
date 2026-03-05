import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[notify-admin] 🚀 Function invoked");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { title, body, type } = await req.json();
    console.log(`[notify-admin] 📋 title="${title}", type="${type}"`);

    // Find all admin user IDs
    const { data: adminRoles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (roleError) {
      console.error("[notify-admin] ❌ Error fetching admin roles:", roleError);
      throw roleError;
    }

    console.log(`[notify-admin] 👥 Found ${adminRoles?.length || 0} admin(s)`);

    let pushSent = 0;
    let internalSent = 0;

    for (const admin of adminRoles || []) {
      // 1. Create internal notification
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: admin.user_id,
          title,
          body,
          type: type || "info",
        });

      if (notifError) {
        console.warn(`[notify-admin] ⚠️ Internal notification error for ${admin.user_id}:`, notifError);
      } else {
        internalSent++;
      }

      // 2. Send push notification
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("id, subscription")
        .eq("user_id", admin.user_id);

      if (subs && subs.length > 0) {
        console.log(`[notify-admin] 📡 Sending push to admin ${admin.user_id} (${subs.length} subs)`);
        
        const sendPushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;
        const response = await fetch(sendPushUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            user_id: admin.user_id,
            title,
            body,
            url: "/admin",
          }),
        });

        if (response.ok) pushSent++;
        await response.text();
      }
    }

    console.log(`[notify-admin] ✅ Complete: internal=${internalSent}, push=${pushSent}`);

    return new Response(
      JSON.stringify({ internal_sent: internalSent, push_sent: pushSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[notify-admin] ❌ Fatal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
