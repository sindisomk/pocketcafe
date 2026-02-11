 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 const FACEPP_API_URL = "https://api-us.faceplusplus.com/facepp/v3";
 const FACESET_OUTER_ID = "pocketcafe-staff";
 const MAX_RETRIES = 3;
 const INITIAL_BACKOFF_MS = 1000;
 
interface EnrollRequest {
  staffId: string;
  imageBase64: string;
}

// Image validation limits (same as face-search)
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max

// Validate base64 image data
function validateImageData(imageBase64: string): { valid: boolean; error?: string } {
  if (!imageBase64) {
    return { valid: false, error: "imageBase64 is required" };
  }

  // Check if it's valid base64 format
  if (typeof imageBase64 !== 'string') {
    return { valid: false, error: "imageBase64 must be a string" };
  }

  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // Estimate decoded size (base64 is ~4/3 of original)
  const estimatedSize = Math.ceil(base64Data.length * 0.75);
  if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB` };
  }

  // Basic validation that it looks like base64
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    return { valid: false, error: "Invalid base64 image data" };
  }

  return { valid: true };
}
 
 // Helper function to make Face++ API requests with retry logic
 async function facePlusPlusRequest(
   endpoint: string, 
   formData: FormData, 
   retries = 0
 ): Promise<{ response: Response; data: any }> {
   const response = await fetch(`${FACEPP_API_URL}/${endpoint}`, {
     method: "POST",
     body: formData,
   });
 
   const data = await response.json();
 
   // Check for concurrency limit error
   if (data.error_message === "CONCURRENCY_LIMIT_EXCEEDED" && retries < MAX_RETRIES) {
     const delay = INITIAL_BACKOFF_MS * Math.pow(2, retries);
     console.log(`[face-enroll] Concurrency limit hit, retrying ${endpoint} in ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
     await new Promise(resolve => setTimeout(resolve, delay));
     return facePlusPlusRequest(endpoint, formData, retries + 1);
   }
 
   return { response, data };
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

      if (!staffId) {
        return new Response(
          JSON.stringify({ success: false, error: "staffId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate image data (size, format)
      const validation = validateImageData(imageBase64);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ success: false, error: validation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
 
     console.log(`[face-enroll] Enrolling face for staff: ${staffId}`);
 
     // Step 1: Detect face in the image
     const detectFormData = new FormData();
     detectFormData.append("api_key", FACEPP_API_KEY);
     detectFormData.append("api_secret", FACEPP_API_SECRET);
     detectFormData.append("image_base64", imageBase64);
 
      const { response: detectResponse, data: detectData } = await facePlusPlusRequest("detect", detectFormData);
     console.log(`[face-enroll] Detect response:`, JSON.stringify(detectData));
 
      if (detectData.error_message) {
        console.error(`[face-enroll] Face++ Detect API error: ${detectData.error_message}`);
        throw new Error("Face detection failed. Please try again.");
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
 
      const { data: getSetData } = await facePlusPlusRequest("faceset/getdetail", getSetFormData);
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
 
        const { data: createSetData } = await facePlusPlusRequest("faceset/create", createSetFormData);
       console.log(`[face-enroll] FaceSet created:`, JSON.stringify(createSetData));
 
        if (createSetData.faceset_token) {
          faceSetExists = true;
        } else if (createSetData.error_message?.includes("FACESET_EXIST")) {
          // FaceSet already exists (race condition)
          faceSetExists = true;
          console.log(`[face-enroll] FaceSet already existed (race condition)`);
        } else {
          console.error(`[face-enroll] Failed to create FaceSet: ${JSON.stringify(createSetData)}`);
          throw new Error("Face registration service unavailable. Please try again.");
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
 
      const { response: addFaceResponse, data: addFaceData } = await facePlusPlusRequest("faceset/addface", addFaceFormData);
     console.log(`[face-enroll] Add face response:`, JSON.stringify(addFaceData));
 
      if (addFaceData.error_message) {
        console.error(`[face-enroll] Failed to add face to FaceSet: ${JSON.stringify(addFaceData)}`);
        throw new Error("Failed to register face. Please try again.");
      }

     // Step 4: Store face_token in staff_profiles
     const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
 
     const { error: updateError } = await supabase
       .from("staff_profiles")
       .update({ face_token: faceToken })
       .eq("id", staffId);
 
      if (updateError) {
        console.error(`[face-enroll] Database update error:`, updateError);
        throw new Error("Failed to save enrollment. Please try again.");
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
      // Return generic error to client; detailed error stays in server logs only
      return new Response(
        JSON.stringify({ success: false, error: "Face enrollment failed. Please try again or contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
   }
 });