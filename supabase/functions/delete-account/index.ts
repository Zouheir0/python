import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigin = (Deno.env.get("APP_ORIGIN") ?? "").replace(/\/$/, "");

function respond(body: unknown, status: number, origin: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (origin && origin === allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (!allowedOrigin || origin !== allowedOrigin) return respond({ error: "Origin is not allowed." }, 403, origin);
  if (request.method === "OPTIONS") return respond({ ok: true }, 200, origin);
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405, origin);
  if (!projectUrl || !anonKey || !serviceRoleKey) return respond({ error: "Account deletion is not configured on the server." }, 500, origin);
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return respond({ error: "Sign in is required." }, 401, origin);

  const userClient = createClient(projectUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return respond({ error: "The session is invalid or expired." }, 401, origin);

  // The service-role key exists only in Supabase's server-side function environment.
  const adminClient = createClient(projectUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) return respond({ error: "The account could not be deleted. Please try again." }, 500, origin);
  return respond({ ok: true }, 200, origin);
});
