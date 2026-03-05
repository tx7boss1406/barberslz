import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Check if user already has an active subscription
  useEffect(() => {
    if (!userId || !supported) {
      setChecking(false);
      return;
    }

    const checkExisting = async () => {
      try {
        console.log("[Push] Checking existing subscription for user:", userId);
        
        // Check browser-side subscription
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        
        if (existingSub) {
          // Also check DB
          const { data, error } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("user_id", userId)
            .limit(1);
          
          if (!error && data && data.length > 0) {
            console.log("[Push] ✅ User already has active subscription");
            setIsSubscribed(true);
          } else {
            console.log("[Push] Browser has subscription but not in DB");
          }
        } else {
          console.log("[Push] No browser subscription found");
        }
      } catch (e) {
        console.warn("[Push] Check existing error:", e);
      } finally {
        setChecking(false);
      }
    };

    checkExisting();
  }, [userId, supported]);

  const subscribe = useCallback(async () => {
    console.log("[Push] subscribe() called, userId:", userId, "supported:", supported);

    if (!userId) {
      console.warn("[Push] No userId, aborting.");
      return false;
    }
    if (!supported) {
      console.warn("[Push] Push not supported in this browser.");
      return false;
    }

    setLoading(true);
    try {
      // Step 1: Request permission
      console.log("[Push] Step 1: Requesting notification permission...");
      const result = await Notification.requestPermission();
      console.log("[Push] Permission result:", result);

      if (result !== "granted") {
        console.warn("[Push] Permission denied or dismissed.");
        setLoading(false);
        return false;
      }

      // Step 2: Get VAPID public key
      console.log("[Push] Step 2: Fetching VAPID public key...");
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke("get-vapid-key");
      console.log("[Push] VAPID response:", vapidData, "error:", vapidError);

      if (vapidError || !vapidData?.publicKey) {
        console.error("[Push] Failed to get VAPID key.");
        setLoading(false);
        return false;
      }
      const vapidKey = vapidData.publicKey;
      console.log("[Push] VAPID public key obtained:", vapidKey.substring(0, 20) + "...");

      // Step 3: Get service worker registration
      console.log("[Push] Step 3: Getting service worker registration...");
      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] Service worker ready:", registration.scope);

      // Step 3b: Unsubscribe existing if any
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        console.log("[Push] Unsubscribing existing push subscription...");
        await existing.unsubscribe();
      }

      // Step 4: Subscribe to push
      console.log("[Push] Step 4: Calling pushManager.subscribe()...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      console.log("[Push] Subscription created:", JSON.stringify(subscription.toJSON()));

      const subscriptionJSON = subscription.toJSON();

      // Step 5: Delete old DB records for this user
      console.log("[Push] Step 5: Removing old subscriptions from DB...");
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId);
      if (deleteError) console.warn("[Push] Delete old subs error:", deleteError);

      // Step 6: Insert new subscription
      console.log("[Push] Step 6: Inserting new subscription into DB...");
      const { data: insertData, error: insertError } = await supabase
        .from("push_subscriptions")
        .insert([{ user_id: userId, subscription: subscriptionJSON as any }])
        .select();

      if (insertError) {
        console.error("[Push] Insert error:", insertError);
        setLoading(false);
        return false;
      }

      console.log("[Push] ✅ Subscription saved successfully!", insertData);
      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error("[Push] Exception during subscribe:", error);
      setLoading(false);
      return false;
    }
  }, [userId, supported]);

  return { isSubscribed, subscribe, loading, supported, checking };
}
