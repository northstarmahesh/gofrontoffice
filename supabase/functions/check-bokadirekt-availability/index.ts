import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendar_url, clinic_id } = await req.json();

    if (!calendar_url) {
      return new Response(
        JSON.stringify({ error: 'calendar_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching availability from:', calendar_url);

    // Fetch the Bokadirekt page
    const response = await fetch(calendar_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse available times from the HTML
    // Look for time slots like "10:00250 kr" or "11:00250 kr"
    const timePattern = /(\d{1,2}:\d{2})(\d+)\s*kr/g;
    const matches = [...html.matchAll(timePattern)];
    
    const availableTimes = matches.map(match => ({
      time: match[1],
      price: parseInt(match[2])
    }));

    // Extract date information if available
    const datePattern = /(\d{1,2})\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/gi;
    const dateMatches = [...html.matchAll(datePattern)];
    
    let dates = dateMatches.slice(0, 7).map(match => ({
      day: match[1],
      month: match[2]
    }));

    console.log('Found times:', availableTimes.length);

    // Get service name from calendar if clinic_id provided
    let serviceName = '';
    if (clinic_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data } = await supabase
        .from('bokadirekt_calendars')
        .select('service_name')
        .eq('calendar_url', calendar_url)
        .eq('clinic_id', clinic_id)
        .maybeSingle();

      if (data) {
        serviceName = data.service_name;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        calendar_url,
        service_name: serviceName,
        available_times: availableTimes,
        dates: dates.length > 0 ? dates : null,
        total_slots: availableTimes.length,
        checked_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error checking availability:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});