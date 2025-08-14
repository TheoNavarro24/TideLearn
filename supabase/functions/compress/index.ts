import { compressToEncodedURIComponent } from "https://deno.land/x/lzstring@1.4.4/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const blockSchema = z.object({ id: z.string(), type: z.string() }).passthrough();
const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  blocks: z.array(blockSchema),
});
const courseSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  lessons: z.array(lessonSchema),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { course, origin } = await req.json();
    const validCourse = courseSchema.parse(course);
    const hash = compressToEncodedURIComponent(JSON.stringify(validCourse));
    const shareUrl = `${origin}/view#${hash}`;
    return new Response(JSON.stringify({ shareUrl, hash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
