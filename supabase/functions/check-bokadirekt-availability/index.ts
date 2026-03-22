import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingHandoffRequest {
  calendar_url: string;
  clinic_id: string;
  selected_time?: string;
  selected_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: BookingHandoffRequest = await req.json();
    const { 
      calendar_url, 
      clinic_id, 
      selected_time, 
      selected_date,
      customer_name,
      customer_phone,
      customer_email 
    } = payload;

    // If this is a booking handoff request (user selected a time)
    if (selected_time && customer_name) {
      return await handleBookingHandoff(payload);
    }

    if (!calendar_url) {
      return new Response(
        JSON.stringify({ error: 'calendar_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching availability from:', calendar_url);

    // Fetch the Bokadirekt page with timeout and error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response;
    try {
      response = await fetch(calendar_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Bokadirekt page took too long to load');
      }
      throw new Error(`Network error: ${fetchError.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch Bokadirekt page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    if (!html || html.length < 100) {
      throw new Error('Invalid or empty response from Bokadirekt');
    }
    
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

    // If no times found, the page structure may have changed
    if (availableTimes.length === 0) {
      console.warn('No time slots found - page structure may have changed');
      return new Response(
        JSON.stringify({
          success: true,
          calendar_url,
          available_times: [],
          dates: null,
          total_slots: 0,
          checked_at: new Date().toISOString(),
          warning: 'No available times found. Page structure may have changed or no slots are available.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        success: false,
        error_type: error.name || 'UnknownError'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleBookingHandoff(payload: BookingHandoffRequest) {
  const { 
    calendar_url, 
    clinic_id, 
    selected_time, 
    selected_date,
    customer_name,
    customer_phone,
    customer_email 
  } = payload;

  try {
    // Validate required fields
    if (!customer_name?.trim()) {
      throw new Error('Customer name is required');
    }
    if (!customer_phone?.trim() && !customer_email?.trim()) {
      throw new Error('Customer phone or email is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch clinic and service details
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, admin_email')
      .eq('id', clinic_id)
      .single();

    const { data: calendar } = await supabase
      .from('bokadirekt_calendars')
      .select('service_name, service_description')
      .eq('calendar_url', calendar_url)
      .eq('clinic_id', clinic_id)
      .maybeSingle();

    if (!clinic?.admin_email) {
      throw new Error('Clinic admin email not configured');
    }

    // Format the email
    const emailHtml = `
      <h2>Ny bokningsförfrågan via Go Front Office</h2>
      
      <h3>Klinikinfo</h3>
      <p><strong>Klinik:</strong> ${clinic.name}</p>
      
      <h3>Tjänst</h3>
      <p><strong>Tjänst:</strong> ${calendar?.service_name || 'Ej specificerad'}</p>
      ${calendar?.service_description ? `<p><strong>Beskrivning:</strong> ${calendar.service_description}</p>` : ''}
      
      <h3>Önskad tid</h3>
      <p><strong>Datum:</strong> ${selected_date || 'Ej specificerat'}</p>
      <p><strong>Tid:</strong> ${selected_time}</p>
      
      <h3>Kundinformation</h3>
      <p><strong>Namn:</strong> ${customer_name}</p>
      ${customer_phone ? `<p><strong>Telefon:</strong> ${customer_phone}</p>` : ''}
      ${customer_email ? `<p><strong>E-post:</strong> ${customer_email}</p>` : ''}
      
      <h3>Nästa steg</h3>
      <p>Vänligen slutför bokningen manuellt via Bokadirekt:</p>
      <p><a href="${calendar_url}">${calendar_url}</a></p>
      
      <hr>
      <p style="color: #666; font-size: 12px;">Detta meddelande skickades automatiskt från Go Front Office AI-assistenten.</p>
    `;

    // Send email via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Go Front Office <onboarding@resend.dev>',
        to: [clinic.admin_email],
        subject: `Ny bokningsförfrågan - ${customer_name}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Error sending email:', errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    console.log('Booking handoff email sent successfully to:', clinic.admin_email);

    // Log the activity
    await supabase
      .from('activity_logs')
      .insert({
        clinic_id,
        user_id: clinic_id, // Using clinic_id as placeholder
        type: 'booking_request',
        title: `Bokningsförfrågan: ${customer_name}`,
        summary: `Kund ${customer_name} vill boka ${calendar?.service_name || 'tjänst'} kl ${selected_time} ${selected_date || ''}`,
        status: 'pending',
        direction: 'inbound',
        contact_name: customer_name,
        contact_info: customer_phone || customer_email
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking handoff email sent successfully',
        email_sent_to: clinic.admin_email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in booking handoff:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}