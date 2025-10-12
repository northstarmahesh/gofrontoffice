/**
 * Shared AI Service for generating contextual responses
 * Used by all channel webhooks (SMS, WhatsApp, Instagram, Messenger)
 */

export interface ClinicInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  assistant_prompt?: string;
}

export interface GenerateResponseParams {
  messageText: string;
  clinic: ClinicInfo;
  knowledgeBase: string;
  channelType: 'sms' | 'whatsapp' | 'instagram' | 'messenger';
}

export interface AIResponse {
  responseText: string;
}

/**
 * Generates contextual AI response for incoming messages
 * @param params - Parameters for generating the response
 * @returns Promise with the generated response text
 * @throws Error if AI API call fails
 */
export async function generateAiResponse(
  params: GenerateResponseParams
): Promise<AIResponse> {
  const { messageText, clinic, knowledgeBase, channelType } = params;

  // Get channel-specific instructions
  const channelInstructions = getChannelInstructions(channelType);

  // Build system prompt
  const basePrompt = clinic.assistant_prompt || 
    `You are a helpful AI assistant for ${clinic.name || 'a clinic'}.`;
  
  const systemPrompt = `${basePrompt}

${channelInstructions}

Clinic Information:
- Name: ${clinic.name || 'N/A'}
- Phone: ${clinic.phone || 'N/A'}
- Email: ${clinic.email || 'N/A'}
- Address: ${clinic.address || 'N/A'}

Knowledge Base:
${knowledgeBase || 'No additional information available.'}

Important: Keep your response clear, concise, and helpful. Be professional yet friendly.`;

  // Get API key
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY not configured');
    throw new Error('AI service configuration error');
  }

  // Call Lovable AI API
  console.log(`Generating AI response for ${channelType} message...`);
  
  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: messageText }
      ],
    }),
  });

  // Handle API errors
  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('AI API error:', aiResponse.status, errorText);
    
    if (aiResponse.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (aiResponse.status === 402) {
      throw new Error('Payment required. Please add credits to your workspace.');
    }
    
    throw new Error(`AI API request failed with status ${aiResponse.status}`);
  }

  // Parse and return response
  const aiData = await aiResponse.json();
  const responseText = aiData.choices?.[0]?.message?.content;
  
  if (!responseText) {
    console.error('AI response missing content:', aiData);
    throw new Error('AI failed to generate a response');
  }

  console.log(`AI response generated (${responseText.length} chars)`);
  
  return { responseText };
}

/**
 * Get channel-specific instructions for the AI
 */
function getChannelInstructions(channelType: string): string {
  switch (channelType) {
    case 'sms':
      return 'You are responding via SMS, so keep responses brief (under 160 characters when possible).';
    
    case 'whatsapp':
      return 'You are responding via WhatsApp, so keep responses conversational and friendly. Use emojis appropriately to maintain a friendly tone.';
    
    case 'instagram':
      return 'You are responding via Instagram DM, so be friendly, professional, and concise. Keep responses brief and suitable for Instagram DM format.';
    
    case 'messenger':
      return 'You are responding via Facebook Messenger, so be conversational and friendly. Respond professionally and helpfully to customer inquiries.';
    
    default:
      return 'You are responding to a customer message. Be professional and helpful.';
  }
}
