 import { createClient } from "npm:@supabase/supabase-js@2";
 import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 interface PinRequest {
   action: "set" | "verify";
   pin: string;
   current_pin?: string;
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
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
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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
         Deno.env.get("SUPABASE_URL") ?? "",
         Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
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
           const isValid = await bcrypt.compare(current_pin, existingPin.pin_hash);
           if (!isValid) {
             return new Response(
               JSON.stringify({ error: "Current PIN is incorrect" }),
               { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
             );
           }
         }
       }
 
       // Hash the new PIN with bcrypt (cost factor 10)
       const pinHash = await bcrypt.hash(pin);
 
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
       // Fetch all manager PIN hashes
       const { data: pins, error: fetchError } = await supabaseAdmin
         .from("manager_pins")
         .select("user_id, pin_hash");
 
       if (fetchError || !pins || pins.length === 0) {
         return new Response(
           JSON.stringify({ valid: false, error: "No manager PINs configured" }),
           { headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // Compare against each hash (bcrypt.compare is timing-safe)
       for (const pinRecord of pins) {
         const isMatch = await bcrypt.compare(pin, pinRecord.pin_hash);
         if (isMatch) {
           return new Response(
             JSON.stringify({ valid: true, manager_id: pinRecord.user_id }),
             { headers: { ...corsHeaders, "Content-Type": "application/json" } }
           );
         }
       }
 
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
     return new Response(
       JSON.stringify({ error: "Internal server error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });