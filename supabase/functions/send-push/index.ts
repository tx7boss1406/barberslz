import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Utility helpers ──

function b64url(arr: Uint8Array): string {
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const bin = atob(base64 + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

// ── HKDF (RFC 5869) ── FIXED: salt is the HMAC key, ikm is the data

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  // Extract: PRK = HMAC-SHA-256(salt, IKM)
  const extractKey = await crypto.subtle.importKey(
    "raw", salt.length > 0 ? salt : new Uint8Array(32),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", extractKey, ikm));

  // Expand: T(1) = HMAC-SHA-256(PRK, info || 0x01)
  const expandKey = await crypto.subtle.importKey(
    "raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", expandKey, concat(info, new Uint8Array([1]))));
  return okm.slice(0, length);
}

// ── VAPID JWT (ES256) ──

async function createVapidJwt(
  audience: string, subject: string, privateKeyB64: string, publicKeyB64: string
): Promise<string> {
  const enc = new TextEncoder();
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const headerB64 = b64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const pubBytes = b64urlDecode(publicKeyB64);
  const jwk = {
    kty: "EC", crv: "P-256",
    x: b64url(pubBytes.slice(1, 33)),
    y: b64url(pubBytes.slice(33, 65)),
    d: privateKeyB64,
  };

  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)));

  return `${unsigned}.${b64url(sig)}`;
}

// ── aes128gcm encryption (RFC 8291) ──

async function encryptPayload(
  p256dh: string, auth: string, payload: string
): Promise<Uint8Array> {
  const clientPub = b64urlDecode(p256dh);
  const clientAuth = b64urlDecode(auth);
  const enc = new TextEncoder();

  // Generate server ECDH key pair
  const serverKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));

  // Derive shared secret
  const clientKey = await crypto.subtle.importKey("raw", clientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKeys.privateKey, 256)
  );

  // Random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Step 1: Derive IKM from shared secret + auth
  // info = "WebPush: info\0" || ua_public(65) || as_public(65)
  const authInfo = concat(enc.encode("WebPush: info\0"), clientPub, serverPubRaw);
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  // Step 2: Derive CEK and nonce from IKM + salt
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // Step 3: Encrypt (plaintext || 0x02 delimiter)
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext));

  // Step 4: Build aes128gcm body
  // salt(16) || rs(4, big-endian 4096) || keyid_len(1, =65) || server_pub(65) || ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concat(salt, rs, new Uint8Array([65]), serverPubRaw, ciphertext);
}

// ── Send single push ──

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: object,
  vapidPublic: string,
  vapidPrivate: string
): Promise<{ success: boolean; status: number; body: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    console.log(`[send-push] 📡 Sending to endpoint: ${subscription.endpoint.substring(0, 80)}...`);
    console.log(`[send-push] 🔑 p256dh length: ${subscription.keys.p256dh.length}, auth length: ${subscription.keys.auth.length}`);

    const jwt = await createVapidJwt(audience, "mailto:contato@barberclub.com", vapidPrivate, vapidPublic);
    console.log(`[send-push] ✅ VAPID JWT created`);

    const body = await encryptPayload(subscription.keys.p256dh, subscription.keys.auth, JSON.stringify(payload));
    console.log(`[send-push] ✅ Payload encrypted (aes128gcm), size: ${body.length} bytes`);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": body.length.toString(),
        Authorization: `vapid t=${jwt}, k=${vapidPublic}`,
        TTL: "86400",
        Urgency: "high",
      },
      body,
    });

    const responseBody = await response.text();
    console.log(`[send-push] 📨 FCM Response: status=${response.status}, body=${responseBody.substring(0, 200)}`);

    if (response.status === 410 || response.status === 404) {
      console.log(`[send-push] ⚠️ Subscription expired (${response.status}), marking for removal`);
      return { success: false, status: response.status, body: responseBody };
    }

    if (!response.ok) {
      console.error(`[send-push] ❌ Push failed: ${response.status} ${responseBody}`);
    }

    return { success: response.ok, status: response.status, body: responseBody };
  } catch (error) {
    console.error(`[send-push] ❌ Exception:`, error);
    return { success: false, status: 0, body: error.message };
  }
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-push] ═══════════════════════════════════════");
    console.log("[send-push] 🚀 Function invoked");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublic || !vapidPrivate) {
      console.error("[send-push] ❌ VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`[send-push] ✅ VAPID keys loaded (public: ${vapidPublic.substring(0, 20)}...)`);

    const { user_id, title, body, url } = await req.json();
    console.log(`[send-push] 📋 Request: user_id=${user_id}, title="${title}"`);

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing user_id, title, or body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscriptions using service role (bypasses RLS)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", user_id);

    if (subError) {
      console.error("[send-push] ❌ DB query error:", subError);
      throw subError;
    }

    console.log(`[send-push] 📊 Found ${subscriptions?.length || 0} subscription(s) for user ${user_id}`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = { title, body, url: url || "/" };
    let sent = 0;
    const expiredIds: string[] = [];

    for (const sub of subscriptions) {
      const subscription = sub.subscription as { endpoint: string; keys: { p256dh: string; auth: string } };

      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        console.error(`[send-push] ❌ Invalid subscription format for id=${sub.id}:`, JSON.stringify(subscription).substring(0, 200));
        expiredIds.push(sub.id);
        continue;
      }

      const result = await sendWebPush(subscription, payload, vapidPublic, vapidPrivate);
      if (result.success) {
        sent++;
        console.log(`[send-push] ✅ Push sent successfully to sub ${sub.id}`);
      } else if (result.status === 410 || result.status === 404) {
        expiredIds.push(sub.id);
      }
    }

    // Cleanup expired subscriptions
    if (expiredIds.length > 0) {
      console.log(`[send-push] 🧹 Removing ${expiredIds.length} expired subscription(s)`);
      await supabaseAdmin.from("push_subscriptions").delete().in("id", expiredIds);
    }

    console.log(`[send-push] ✅ Complete: sent=${sent}, expired=${expiredIds.length}`);
    console.log("[send-push] ═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ sent, expired: expiredIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-push] ❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
