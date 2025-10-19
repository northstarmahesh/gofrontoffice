import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestAIRequest {
  message: string;
  clinicName?: string;
  clinicType?: string;
  systemPrompt?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, clinicName, clinicType, systemPrompt }: TestAIRequest = await req.json();

    if (!message || !message.trim()) {
      throw new Error("Message is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    // Build the system prompt
    const defaultPrompt = `You are a professional front office assistant for ${clinicName || "a healthcare clinic"}. You help patients/customers with:
- Scheduling appointments
- Answering questions about services
- General inquiries

Be warm, professional, and helpful. Keep responses concise and friendly.`;

    const finalSystemPrompt = systemPrompt || defaultPrompt;

    console.log("Testing AI with message:", message);
    console.log("Clinic:", clinicName, "Type:", clinicType);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits depleted. Please add credits to your Lovable workspace.");
      }
      
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      throw new Error("No response from AI");
    }

    console.log("AI response generated successfully");

    return new Response(
      JSON.stringify({ 
        response: aiMessage,
        success: true 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in test-ai-response:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to generate AI response",
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
