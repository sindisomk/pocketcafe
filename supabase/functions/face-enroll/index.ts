 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const FACEPP_API_URL = "https://api-us.faceplusplus.com/facepp/v3";
 const FACESET_OUTER_ID = "pocketcafe-staff";
 
 interface EnrollRequest {
   staffId: string;
   imageBase64: string;
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
     const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
 
     if (!FACEPP_API_KEY) {
       throw new Error("FACEPP_API_KEY is not configured");
     }
     if (!FACEPP_API_SECRET) {
       throw new Error("FACEPP_API_SECRET is not configured");
     }
     if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
       throw new Error("Supabase configuration is missing");
     }
 
     // Validate JWT - required for Lovable Cloud (ES256 signing)
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(
         JSON.stringify({ success: false, error: "Missing authorization header" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const token = authHeader.replace("Bearer ", "");
     const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!, {
       global: { headers: { Authorization: authHeader } },
     });
 
     const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
     if (claimsError || !claimsData?.user) {
       console.error("[face-enroll] JWT validation failed:", claimsError);
       return new Response(
         JSON.stringify({ success: false, error: "Invalid authentication token" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[face-enroll] Authenticated user: ${claimsData.user.id}`);
 
     const { staffId, imageBase64 }: EnrollRequest = await req.json();
 
     if (!staffId || !imageBase64) {
       return new Response(
         JSON.stringify({ success: false, error: "staffId and imageBase64 are required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[face-enroll] Enrolling face for staff: ${staffId}`);
 
     // Step 1: Detect face in the image
     const detectFormData = new FormData();
     detectFormData.append("api_key", FACEPP_API_KEY);
     detectFormData.append("api_secret", FACEPP_API_SECRET);
     detectFormData.append("image_base64", imageBase64);
 
     const detectResponse = await fetch(`${FACEPP_API_URL}/detect`, {
       method: "POST",
       body: detectFormData,
     });
 
     const detectData = await detectResponse.json();
     console.log(`[face-enroll] Detect response:`, JSON.stringify(detectData));
 
     if (!detectResponse.ok) {
       throw new Error(`Face++ Detect API error: ${JSON.stringify(detectData)}`);
     }
 
     if (!detectData.faces || detectData.faces.length === 0) {
       return new Response(
         JSON.stringify({ success: false, error: "No face detected in the image" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     if (detectData.faces.length > 1) {
       return new Response(
         JSON.stringify({ success: false, error: "Multiple faces detected. Please ensure only one person is in frame." }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const faceToken = detectData.faces[0].face_token;
     console.log(`[face-enroll] Face token obtained: ${faceToken}`);
 
      // Step 2: Ensure FaceSet exists (create if needed)
      let faceSetExists = false;
      
     const getSetFormData = new FormData();
     getSetFormData.append("api_key", FACEPP_API_KEY);
     getSetFormData.append("api_secret", FACEPP_API_SECRET);
     getSetFormData.append("outer_id", FACESET_OUTER_ID);
 
     const getSetResponse = await fetch(`${FACEPP_API_URL}/faceset/getdetail`, {
       method: "POST",
       body: getSetFormData,
     });
 
     const getSetData = await getSetResponse.json();
      console.log(`[face-enroll] FaceSet getdetail response:`, JSON.stringify(getSetData));
 
      if (getSetData.faceset_token) {
        // FaceSet exists
        faceSetExists = true;
        console.log(`[face-enroll] FaceSet already exists: ${FACESET_OUTER_ID}`);
      } else if (getSetData.error_message) {
        // FaceSet doesn't exist or other error - try to create it
       console.log(`[face-enroll] Creating FaceSet: ${FACESET_OUTER_ID}`);
       const createSetFormData = new FormData();
       createSetFormData.append("api_key", FACEPP_API_KEY);
       createSetFormData.append("api_secret", FACEPP_API_SECRET);
       createSetFormData.append("outer_id", FACESET_OUTER_ID);
       createSetFormData.append("display_name", "PocketCafe Staff");
 
       const createSetResponse = await fetch(`${FACEPP_API_URL}/faceset/create`, {
         method: "POST",
         body: createSetFormData,
       });
 
       const createSetData = await createSetResponse.json();
       console.log(`[face-enroll] FaceSet created:`, JSON.stringify(createSetData));
 
        if (createSetData.faceset_token) {
          faceSetExists = true;
        } else if (createSetData.error_message?.includes("FACESET_EXIST")) {
          // FaceSet already exists (race condition)
          faceSetExists = true;
          console.log(`[face-enroll] FaceSet already existed (race condition)`);
        } else {
         throw new Error(`Failed to create FaceSet: ${JSON.stringify(createSetData)}`);
       }
     }
 
      if (!faceSetExists) {
        throw new Error("FaceSet could not be verified or created");
      }
 
     // Step 3: Add face to FaceSet
     const addFaceFormData = new FormData();
     addFaceFormData.append("api_key", FACEPP_API_KEY);
     addFaceFormData.append("api_secret", FACEPP_API_SECRET);
     addFaceFormData.append("outer_id", FACESET_OUTER_ID);
     addFaceFormData.append("face_tokens", faceToken);
 
     const addFaceResponse = await fetch(`${FACEPP_API_URL}/faceset/addface`, {
       method: "POST",
       body: addFaceFormData,
     });
 
     const addFaceData = await addFaceResponse.json();
     console.log(`[face-enroll] Add face response:`, JSON.stringify(addFaceData));
 
     if (!addFaceResponse.ok) {
       throw new Error(`Failed to add face to FaceSet: ${JSON.stringify(addFaceData)}`);
     }
 
     // Step 4: Store face_token in staff_profiles
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 
     const { error: updateError } = await supabase
       .from("staff_profiles")
       .update({ face_token: faceToken })
       .eq("id", staffId);
 
     if (updateError) {
       console.error(`[face-enroll] Database update error:`, updateError);
       throw new Error(`Failed to update staff profile: ${updateError.message}`);
     }
 
     console.log(`[face-enroll] Successfully enrolled face for staff: ${staffId}`);
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         faceToken,
         message: "Face enrolled successfully" 
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error) {
     console.error("[face-enroll] Error:", error);
     const errorMessage = error instanceof Error ? error.message : "Unknown error";
     return new Response(
       JSON.stringify({ success: false, error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });