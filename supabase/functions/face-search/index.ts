 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const FACEPP_API_URL = "https://api-us.faceplusplus.com/facepp/v3";
 const FACESET_OUTER_ID = "pocketcafe-staff";
 const CONFIDENCE_THRESHOLD = 80; // Minimum confidence for a match
 
 interface SearchRequest {
   imageBase64: string;
 }
 
 interface SearchResult {
   matched: boolean;
   staffId?: string;
   staffName?: string;
   staffPhoto?: string | null;
   confidence?: number;
   error?: string;
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const FACEPP_API_KEY = Deno.env.get("FACEPP_API_KEY");
     const FACEPP_API_SECRET = Deno.env.get("FACEPP_API_SECRET");
     const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
     const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 
     if (!FACEPP_API_KEY) {
       throw new Error("FACEPP_API_KEY is not configured");
     }
     if (!FACEPP_API_SECRET) {
       throw new Error("FACEPP_API_SECRET is not configured");
     }
     if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error("Supabase configuration is missing");
     }
 
     const { imageBase64 }: SearchRequest = await req.json();
 
     if (!imageBase64) {
       return new Response(
         JSON.stringify({ matched: false, error: "imageBase64 is required" } as SearchResult),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[face-search] Starting face search...`);
 
     // Step 1: Search in FaceSet
     const searchFormData = new FormData();
     searchFormData.append("api_key", FACEPP_API_KEY);
     searchFormData.append("api_secret", FACEPP_API_SECRET);
     searchFormData.append("outer_id", FACESET_OUTER_ID);
     searchFormData.append("image_base64", imageBase64);
 
     const searchResponse = await fetch(`${FACEPP_API_URL}/search`, {
       method: "POST",
       body: searchFormData,
     });
 
     const searchData = await searchResponse.json();
     console.log(`[face-search] Search response:`, JSON.stringify(searchData));
 
     // Handle FaceSet not existing yet
     if (searchData.error_message) {
       if (searchData.error_message.includes("FACESET_NOT_EXIST") || 
           searchData.error_message.includes("EMPTY_FACESET")) {
         console.log(`[face-search] FaceSet is empty or doesn't exist yet`);
         return new Response(
           JSON.stringify({ matched: false, error: "No enrolled faces yet" } as SearchResult),
           { headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       if (searchData.error_message.includes("NO_FACE_DETECTED")) {
         return new Response(
           JSON.stringify({ matched: false } as SearchResult),
           { headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       throw new Error(`Face++ Search API error: ${JSON.stringify(searchData)}`);
     }
 
     if (!searchResponse.ok) {
       throw new Error(`Face++ Search API failed: ${JSON.stringify(searchData)}`);
     }
 
     // Check if we have results above threshold
     if (!searchData.results || searchData.results.length === 0) {
       console.log(`[face-search] No matches found`);
       return new Response(
         JSON.stringify({ matched: false } as SearchResult),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const topResult = searchData.results[0];
     const confidence = topResult.confidence;
 
     console.log(`[face-search] Top match confidence: ${confidence}`);
 
     if (confidence < CONFIDENCE_THRESHOLD) {
       console.log(`[face-search] Confidence ${confidence} below threshold ${CONFIDENCE_THRESHOLD}`);
       return new Response(
         JSON.stringify({ matched: false, confidence } as SearchResult),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Step 2: Look up staff by face_token
     const matchedFaceToken = topResult.face_token;
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 
     const { data: staffData, error: staffError } = await supabase
       .from("staff_profiles")
       .select("id, name, profile_photo_url")
       .eq("face_token", matchedFaceToken)
       .single();
 
     if (staffError || !staffData) {
       console.log(`[face-search] Staff not found for face_token: ${matchedFaceToken}`);
       return new Response(
         JSON.stringify({ matched: false, error: "Face recognized but staff not found" } as SearchResult),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[face-search] Match found: ${staffData.name} (${confidence}%)`);
 
     return new Response(
       JSON.stringify({
         matched: true,
         staffId: staffData.id,
         staffName: staffData.name,
         staffPhoto: staffData.profile_photo_url,
         confidence,
       } as SearchResult),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error) {
     console.error("[face-search] Error:", error);
     const errorMessage = error instanceof Error ? error.message : "Unknown error";
     return new Response(
       JSON.stringify({ matched: false, error: errorMessage } as SearchResult),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });