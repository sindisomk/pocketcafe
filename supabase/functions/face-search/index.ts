import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FACEPP_API_URL = "https://api-us.faceplusplus.com/facepp/v3";
const FACESET_OUTER_ID = "pocketcafe-staff";
const CONFIDENCE_THRESHOLD = 80; // Minimum confidence for a match

// Rate limiting configuration - tightened for security
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per minute per IP (reduced from 10)

// Image validation limits
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max

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

interface RateLimitRecord {
  id: string;
  request_count: number;
  window_start: string;
}

// Extract client IP from request headers
function getClientIP(req: Request): string {
  return req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// Check and update rate limit - returns true if request should be allowed
async function checkRateLimit(
  supabaseUrl: string, 
  supabaseKey: string, 
  clientIP: string
): Promise<{ allowed: boolean; remaining: number }> {
  // Create a fresh client for rate limiting (without type constraints)
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  
  // Get current request count for this IP within the window
  const { data: existing, error: selectError } = await supabase
    .from('face_search_rate_limits')
    .select('id, request_count, window_start')
    .eq('client_ip', clientIP)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error('[face-search] Rate limit check error:', selectError);
    // Allow request on error to avoid blocking legitimate traffic
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS };
  }

  const record = existing as RateLimitRecord | null;

  if (record) {
    // Existing window - check if over limit
    if (record.request_count >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }
    
    // Increment counter
    await supabase
      .from('face_search_rate_limits')
      .update({ request_count: record.request_count + 1 })
      .eq('id', record.id);
    
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.request_count - 1 };
  }

  // New window - create entry
  await supabase
    .from('face_search_rate_limits')
    .insert({ client_ip: clientIP, request_count: 1, window_start: new Date().toISOString() });

  // Cleanup old entries periodically (1 in 10 chance)
  if (Math.random() < 0.1) {
    await supabase.rpc('cleanup_old_rate_limits');
  }

  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
}

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ matched: false, error: "Method not allowed" } as SearchResult),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

    // Check rate limit first
    const clientIP = getClientIP(req);
    const { allowed, remaining } = await checkRateLimit(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, clientIP);

    if (!allowed) {
      console.log(`[face-search] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ matched: false, error: "Rate limit exceeded. Please try again in 1 minute." } as SearchResult),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60"
          } 
        }
      );
    }

    // Parse and validate request body
    let body: SearchRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ matched: false, error: "Invalid JSON body" } as SearchResult),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64 } = body;

    // Validate image data
    const validation = validateImageData(imageBase64);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ matched: false, error: validation.error } as SearchResult),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": String(remaining)
          } 
        }
      );
    }

    console.log(`[face-search] Starting face search for IP: ${clientIP.substring(0, 8)}...`);

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
    console.log(`[face-search] Search response status:`, searchResponse.status);

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
      // Don't expose internal Face++ error details
      console.error(`[face-search] Face++ API error:`, searchData.error_message);
      throw new Error("Face recognition service error");
    }

    if (!searchResponse.ok) {
      console.error(`[face-search] Face++ API failed with status:`, searchResponse.status);
      throw new Error("Face recognition service unavailable");
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
      console.log(`[face-search] Staff not found for matched face_token`);
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
    // Return generic error message to avoid information leakage
    return new Response(
      JSON.stringify({ matched: false, error: "Face search failed" } as SearchResult),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
