import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://fakturku.vercel.app",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    console.error("Push notification secrets are not configured");
    return jsonResponse({ error: "notification service is not configured" }, 503);
  }

  let code: string;
  try {
    const body = await request.json();
    code = typeof body?.code === "string" ? body.code : "";
  } catch {
    return jsonResponse({ error: "invalid request body" }, 400);
  }
  if (!/^FKT-[A-Z0-9]{6}$/.test(code)) {
    return jsonResponse({ error: "invalid top-up reference" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser(
    authorization.slice("Bearer ".length),
  );
  if (authError || !user) return jsonResponse({ error: "invalid session" }, 401);

  const { data: event, error: claimError } = await userClient.rpc(
    "claim_topup_push_notification",
    { p_code: code },
  );
  if (claimError) {
    console.error("Unable to claim top-up notification", claimError.message);
    return jsonResponse({ error: "unable to queue notification" }, 403);
  }
  if (!event) return jsonResponse({ delivered: 0, duplicate: true });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: subscriptions, error: subscriptionsError } = await adminClient
    .from("admin_push_subscriptions")
    .select("endpoint, subscription");
  if (subscriptionsError) {
    console.error("Unable to read admin push subscriptions", subscriptionsError.message);
    await markEvent(adminClient, code, false, "unable to read subscriptions");
    return jsonResponse({ error: "unable to deliver notification" }, 503);
  }

  webpush.setVapidDetails(
    "https://fakturku.vercel.app/",
    vapidPublicKey,
    vapidPrivateKey,
  );

  const payload = JSON.stringify({
    title: "Top-up baru menunggu",
    body: "Ada permintaan isi saldo yang perlu diperiksa.",
    url: "/admin",
    tag: `fakturku-topup-${code}`,
  });
  let delivered = 0;
  const failures: string[] = [];

  await Promise.all((subscriptions || []).map(async ({ endpoint, subscription }) => {
    try {
      await webpush.sendNotification(subscription, payload, {
        TTL: 60 * 60,
        urgency: "high",
      });
      delivered += 1;
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode);
      if (statusCode === 404 || statusCode === 410) {
        const { error: deleteError } = await adminClient
          .from("admin_push_subscriptions")
          .delete()
          .eq("endpoint", endpoint);
        if (deleteError) console.error("Unable to remove expired subscription", deleteError.message);
      } else {
        failures.push(`push delivery failed (${statusCode || "unknown status"})`);
        console.error("Push delivery failed", statusCode || "unknown status");
      }
    }
  }));

  if (failures.length) {
    await markEvent(adminClient, code, false, failures[0]);
    return jsonResponse({ error: "one or more notifications could not be delivered" }, 503);
  }

  await markEvent(adminClient, code, true, null);
  return jsonResponse({ delivered });
});

async function markEvent(
  client: ReturnType<typeof createClient>,
  code: string,
  sent: boolean,
  error: string | null,
) {
  const { error: updateError } = await client
    .from("admin_push_events")
    .update({
      status: sent ? "sent" : "failed",
      last_error: error,
      sent_at: sent ? new Date().toISOString() : null,
    })
    .eq("topup_code", code);
  if (updateError) console.error("Unable to update notification status", updateError.message);
}
