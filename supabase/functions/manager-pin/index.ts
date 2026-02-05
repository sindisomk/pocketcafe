import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "jsr:@da/bcrypt@1.0.1";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface PinRequest {
   action: "set" | "verify";
   pin: string;
   current_pin?: string;
}

interface RateLimitRecord {
  id: string;
  attempt_count: number;
}

// Helper function to record verification attempts for rate limiting
// deno-lint-ignore no-explicit-any
async function recordVerificationAttempt(
  supabase: any,
  clientIP: string
): Promise<void> {
  const windowStart = new Date(Date.now() - 5 * 60 * 1000);
  
  // Check for existing window
  const { data: existing } = await supabase
    .from("pin_verification_attempts")
    .select("id, attempt_count")
    .eq("client_ip", clientIP)
    .gte("window_start", windowStart.toISOString())
    .order("window_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const record = existing as RateLimitRecord | null;

  if (record) {
    // Increment existing count
    await supabase
      .from("pin_verification_attempts")
      .update({ attempt_count: record.attempt_count + 1 })
      .eq("id", record.id);
  } else {
    // Create new window
    await supabase
      .from("pin_verification_attempts")
      .insert({ 
        client_ip: clientIP, 
        attempt_count: 1, 
        window_start: new Date().toISOString() 
      });
  }

  // Cleanup old entries occasionally (1 in 10 chance)
  if (Math.random() < 0.1) {
    await supabase
      .from("pin_verification_attempts")
      .delete()
      .lt("window_start", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  }
}

Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL");
     const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
     const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
 
     if (!supabaseUrl || !serviceRoleKey || !anonKey) {
       console.error("Missing required environment variables");
       return new Response(
         JSON.stringify({ error: "Server configuration error" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const { action, pin, current_pin } = (await req.json()) as PinRequest;
 
     // Validate PIN format (4-8 digits)
     if (!pin || !/^\d{4,8}$/.test(pin)) {
       return new Response(
         JSON.stringify({ error: "PIN must be 4-8 digits" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create service role client for database operations
     const supabaseAdmin = createClient(
       supabaseUrl,
       serviceRoleKey
     );
 
     if (action === "set") {
       // Require authentication for setting PIN
       const authHeader = req.headers.get("Authorization");
       if (!authHeader) {
         return new Response(
           JSON.stringify({ error: "Authorization required" }),
           { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // Create user client to verify auth
        const supabaseUser = createClient(
          supabaseUrl,
          anonKey,
          { global: { headers: { Authorization: authHeader } } }
        );
 
       const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
       if (authError || !user) {
         return new Response(
           JSON.stringify({ error: "Invalid authentication" }),
           { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // Check if user is admin or manager
       const { data: roles } = await supabaseAdmin
         .from("user_roles")
         .select("role")
         .eq("user_id", user.id);
 
       const isAdminOrManager = roles?.some(
         (r) => r.role === "admin" || r.role === "manager"
       );
 
       if (!isAdminOrManager) {
         return new Response(
           JSON.stringify({ error: "Admin or manager role required" }),
           { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // If current_pin provided, verify it first
       if (current_pin) {
         const { data: existingPin } = await supabaseAdmin
           .from("manager_pins")
           .select("pin_hash")
           .eq("user_id", user.id)
           .single();
 
         if (existingPin) {
            const isValid = bcrypt.compareSync(current_pin, existingPin.pin_hash);
           if (!isValid) {
             return new Response(
               JSON.stringify({ error: "Current PIN is incorrect" }),
               { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
             );
           }
         }
       }
 
       // Hash the new PIN with bcrypt (cost factor 10)
        const salt = bcrypt.genSaltSync(10);
        const pinHash = bcrypt.hashSync(pin, salt);
 
       // Upsert to manager_pins table
       const { error: upsertError } = await supabaseAdmin
         .from("manager_pins")
         .upsert(
           {
             user_id: user.id,
             pin_hash: pinHash,
             updated_at: new Date().toISOString(),
           },
           { onConflict: "user_id" }
         );
 
       if (upsertError) {
         return new Response(
           JSON.stringify({ error: "Failed to save PIN" }),
           { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       return new Response(
         JSON.stringify({ success: true }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
    if (action === "verify") {
      // No auth required - Kiosk use case
      // Rate limiting: Check for too many failed attempts from this request
      const clientIP = req.headers.get("cf-connecting-ip") || 
                       req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       req.headers.get("x-real-ip") || 
                       "unknown";
      
      // Check rate limit (5 attempts per 5 minutes per IP)
      const windowStart = new Date(Date.now() - 5 * 60 * 1000);
      const { data: rateCheck } = await supabaseAdmin
        .from("pin_verification_attempts")
        .select("attempt_count")
        .eq("client_ip", clientIP)
        .gte("window_start", windowStart.toISOString())
        .order("window_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rateCheck && rateCheck.attempt_count >= 5) {
        return new Response(
          JSON.stringify({ valid: false, error: "Too many attempts. Please wait 5 minutes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch all manager PIN hashes
      const { data: pins, error: fetchError } = await supabaseAdmin
        .from("manager_pins")
        .select("user_id, pin_hash");

      // Dummy hash for constant-time comparison when no PINs exist
      const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

      if (fetchError || !pins || pins.length === 0) {
        // Perform dummy comparison to prevent timing leak
        bcrypt.compareSync(pin, DUMMY_HASH);
        await recordVerificationAttempt(supabaseAdmin, clientIP);
        return new Response(
          JSON.stringify({ valid: false, error: "No manager PINs configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // CRITICAL: Compare against ALL hashes without early return (constant-time)
      let matchedUserId: string | null = null;
      for (const pinRecord of pins) {
        const isMatch = bcrypt.compareSync(pin, pinRecord.pin_hash);
        if (isMatch && !matchedUserId) {
          matchedUserId = pinRecord.user_id;
        }
        // Continue comparing ALL hashes to ensure constant timing
      }

      if (matchedUserId) {
        // Reset rate limit on successful verification
        await supabaseAdmin
          .from("pin_verification_attempts")
          .delete()
          .eq("client_ip", clientIP);
        
        return new Response(
          JSON.stringify({ valid: true, manager_id: matchedUserId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record failed attempt
      await recordVerificationAttempt(supabaseAdmin, clientIP);

      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
 
     return new Response(
       JSON.stringify({ error: "Invalid action" }),
       { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("Edge function error:", error);
     return new Response(
       JSON.stringify({ error: "Internal server error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });