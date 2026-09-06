import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "abeni_device_id";

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function describeDevice() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android device";
  if (/iphone|ipad|ipod/i.test(ua)) return "iPhone / iPad";
  if (/mac/i.test(ua)) return "Mac computer";
  if (/windows/i.test(ua)) return "Windows computer";
  return "Web browser";
}

/**
 * Remembers the device a person signs in from so they are not asked to sign in again,
 * and warns them by email the first time a brand-new device is used.
 */
export function DeviceTrust() {
  useEffect(() => {
    let cancelled = false;

    const register = async (userId: string) => {
      const deviceId = getDeviceId();
      try {
        const { data: existing } = await (supabase as any)
          .from("user_devices")
          .select("id")
          .eq("user_id", userId)
          .eq("device_id", deviceId)
          .maybeSingle();

        if (cancelled) return;

        if (existing) {
          await (supabase as any)
            .from("user_devices")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", existing.id);
          return;
        }

        const { count } = await (supabase as any)
          .from("user_devices")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        await (supabase as any).from("user_devices").insert({
          user_id: userId,
          device_id: deviceId,
          label: describeDevice(),
          user_agent: navigator.userAgent,
        });

        // Only warn when this is not the very first device on the account.
        if ((count ?? 0) > 0) {
          supabase.functions
            .invoke("send-user-email", {
              body: {
                userId,
                subject: "New sign-in on your Abeni Express account",
                heading: "New device sign-in",
                message: `Your account was just opened on a new ${describeDevice()}. If this was you, no action is needed. If it was not you, change your password immediately from the Account page.`,
              },
            })
            .catch((e) => console.error("device warning email failed", e));
        }
      } catch (e) {
        console.error("device registration failed", e);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) register(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setTimeout(() => register(session.user.id), 0);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
