import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find confirmed reservations happening in the next hour
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const todayStr = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 8);
    const futureTime = oneHourFromNow.toTimeString().slice(0, 8);

    const { data: reservas, error } = await supabaseAdmin
      .from("reservas")
      .select("*, barbeiros(nome), servicos(nome)")
      .eq("status", "confirmado")
      .eq("data", todayStr)
      .gte("horario", currentTime)
      .lte("horario", futureTime);

    if (error) throw error;

    let sent = 0;

    for (const reserva of reservas || []) {
      if (!reserva.user_id) continue;

      const sendPushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`;

      const response = await fetch(sendPushUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          user_id: reserva.user_id,
          title: "⏰ Barber Club & Tattoo",
          body: `Seu atendimento com ${reserva.barbeiros?.nome || "nosso barbeiro"} começa em 1 hora! Estamos te esperando.`,
          url: "/",
        }),
      });

      if (response.ok) sent++;
      await response.text(); // consume body
    }

    return new Response(
      JSON.stringify({ reminders_sent: sent, reservas_found: reservas?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
