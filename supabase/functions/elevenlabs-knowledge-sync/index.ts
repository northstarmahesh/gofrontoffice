import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface KnowledgeBaseEntry {
  id: string;
  clinic_id: string;
  title: string;
  content: string | null;
  file_path: string | null;
  source_url: string | null;
  source_type: 'url' | 'text' | 'pdf' | 'file';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting elevenlabs-knowledge-sync function');
    
    const { kb_entry_id, clinic_id } = await req.json();
    console.log('Syncing knowledge base entry:', { kb_entry_id, clinic_id });

    if (!kb_entry_id || !clinic_id) {
      throw new Error('kb_entry_id and clinic_id are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to 'syncing'
    await supabase
      .from('clinic_knowledge_base')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', kb_entry_id);

    // Get knowledge base entry
    console.log('Fetching knowledge base entry');
    const { data: kbEntry, error: kbError } = await supabase
      .from('clinic_knowledge_base')
      .select('*')
      .eq('id', kb_entry_id)
      .single();

    if (kbError || !kbEntry) {
      throw new Error(`Failed to fetch knowledge base entry: ${kbError?.message}`);
    }

    // Get clinic's agent_id
    console.log('Fetching clinic agent details');
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('elevenlabs_agent_id, name')
      .eq('id', clinic_id)
      .single();

    if (clinicError || !clinic) {
      throw new Error(`Failed to fetch clinic: ${clinicError?.message}`);
    }

    if (!clinic.elevenlabs_agent_id) {
      throw new Error('Clinic does not have an Eleven Labs agent. Create agent first.');
    }

    const agentId = clinic.elevenlabs_agent_id;

    // Get Eleven Labs API key
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Upload document to Eleven Labs
    console.log('Uploading document to Eleven Labs, type:', kbEntry.source_type);
    const documentId = await uploadDocument(kbEntry, elevenLabsApiKey, supabaseUrl, supabaseKey);
    
    console.log('Document uploaded successfully:', documentId);

    // Get current agent configuration
    console.log('Fetching current agent configuration');
    const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
    });

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text();
      console.error('Failed to fetch agent:', errorText);
      throw new Error(`Failed to fetch agent: ${agentResponse.status}`);
    }

    const agentData = await agentResponse.json();
    
    // Get existing knowledge base IDs
    const existingKbIds = agentData.conversation_config?.agent?.prompt?.knowledge_base_ids || [];
    console.log('Existing knowledge base IDs:', existingKbIds);

    // Add new document ID if not already present
    const updatedKbIds = existingKbIds.includes(documentId) 
      ? existingKbIds 
      : [...existingKbIds, documentId];

    console.log('Updated knowledge base IDs:', updatedKbIds);

    // Update agent with new knowledge base
    console.log('Updating agent with new knowledge base');
    const patchResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              knowledge_base_ids: updatedKbIds
            }
          }
        }
      }),
    });

    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      console.error('Failed to update agent:', errorText);
      throw new Error(`Failed to update agent: ${patchResponse.status} - ${errorText}`);
    }

    console.log('Agent updated successfully');

    // Update database with success
    const { error: updateError } = await supabase
      .from('clinic_knowledge_base')
      .update({
        elevenlabs_doc_id: documentId,
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
        sync_error: null
      })
      .eq('id', kb_entry_id);

    if (updateError) {
      console.error('Failed to update database:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('Knowledge base entry synced successfully');

    return new Response(
      JSON.stringify({
        success: true,
        document_id: documentId,
        message: 'Knowledge base synced successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in elevenlabs-knowledge-sync:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // CRITICAL: Always update database with error status
    // Parse kb_entry_id from the original request
    let kb_entry_id: string | undefined;
    try {
      const body = await req.clone().json();
      kb_entry_id = body.kb_entry_id;
    } catch (parseError) {
      console.error('Could not parse request body for error handling:', parseError);
    }
    
    if (kb_entry_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { error: updateError } = await supabase
            .from('clinic_knowledge_base')
            .update({
              sync_status: 'failed',
              sync_error: error.message || 'Unknown sync error',
              updated_at: new Date().toISOString()
            })
            .eq('id', kb_entry_id);
          
          if (updateError) {
            console.error('Failed to update error status in database:', updateError);
          } else {
            console.log('Successfully updated sync status to failed for entry:', kb_entry_id);
          }
        }
      } catch (dbError) {
        console.error('Critical: Failed to update error status in database:', dbError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false,
        kb_entry_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function uploadDocument(
  kbEntry: KnowledgeBaseEntry, 
  apiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      // Upload based on source type
      if (kbEntry.source_type === 'url' && kbEntry.source_url) {
        return await uploadFromUrl(kbEntry.source_url, apiKey);
      } else if (kbEntry.source_type === 'text' && kbEntry.content) {
        return await uploadFromText(kbEntry.content, kbEntry.title, apiKey);
      } else if (kbEntry.file_path) {
        return await uploadFromFile(kbEntry.file_path, kbEntry.title, apiKey, supabaseUrl, supabaseKey);
      } else {
        throw new Error('Invalid knowledge base entry: no valid source found');
      }
    } catch (error: any) {
      lastError = error;
      retries++;
      
      if (retries < MAX_RETRIES) {
        console.log(`Upload failed, retrying (${retries}/${MAX_RETRIES}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * retries));
      }
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

async function uploadFromUrl(url: string, apiKey: string): Promise<string> {
  console.log('Uploading from URL:', url);
  
  const response = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/url', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('URL upload error:', errorText);
    throw new Error(`Failed to upload URL: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.document_id;
}

async function uploadFromText(text: string, title: string, apiKey: string): Promise<string> {
  console.log('Uploading from text, length:', text.length);
  
  const response = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      text,
      name: title || 'Knowledge Base Entry'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Text upload error:', errorText);
    throw new Error(`Failed to upload text: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.document_id;
}

async function uploadFromFile(
  filePath: string, 
  title: string,
  apiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  console.log('Uploading from file:', filePath);
  
  // Download file from Supabase storage
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('knowledge-base-pdfs')
    .download(filePath);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
  }

  // Check file size
  const fileSize = fileData.size;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${fileSize} bytes (max ${MAX_FILE_SIZE} bytes)`);
  }

  console.log('File downloaded, size:', fileSize, 'bytes');

  // Create form data
  const formData = new FormData();
  formData.append('file', fileData, title || 'document');

  // Upload to Eleven Labs
  const response = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('File upload error:', errorText);
    throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.document_id;
}
