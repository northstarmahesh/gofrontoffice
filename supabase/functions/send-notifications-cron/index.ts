import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationUser {
  user_id: string;
  email: string;
  full_name: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  pending_tasks_time: string;
  analytics_frequency: string;
  phone?: string;
}

interface PendingTask {
  id: string;
  title: string;
  priority: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting notification cron job...');

    // Get current hour to check if we should send notifications
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    // Fetch all users with their notification settings
    const { data: notificationSettings, error: settingsError } = await supabase
      .from('notification_settings')
      .select(`
        user_id,
        email_enabled,
        sms_enabled,
        pending_tasks_time,
        analytics_frequency
      `);

    if (settingsError) {
      throw new Error(`Failed to fetch notification settings: ${settingsError.message}`);
    }

    console.log(`Found ${notificationSettings?.length || 0} users with notification settings`);

    const results = {
      emailsSent: 0,
      smsSent: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const setting of notificationSettings || []) {
      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', setting.user_id)
          .single();

        if (profileError || !profile) {
          console.error(`Failed to fetch profile for user ${setting.user_id}`);
          continue;
        }

        // Get user's clinic phone if SMS is enabled
        let userPhone: string | null = null;
        if (setting.sms_enabled) {
          const { data: clinicUser } = await supabase
            .from('clinic_users')
            .select('clinic_id')
            .eq('user_id', setting.user_id)
            .limit(1)
            .single();

          if (clinicUser) {
            const { data: clinic } = await supabase
              .from('clinics')
              .select('phone')
              .eq('id', clinicUser.clinic_id)
              .single();

            userPhone = clinic?.phone || null;
          }
        }

        const user: NotificationUser = {
          user_id: setting.user_id,
          email: profile.email,
          full_name: profile.full_name || 'User',
          email_enabled: setting.email_enabled,
          sms_enabled: setting.sms_enabled,
          pending_tasks_time: setting.pending_tasks_time,
          analytics_frequency: setting.analytics_frequency,
          phone: userPhone || undefined,
        };

        // Check for pending tasks
        const shouldSendPendingTasksNotification = shouldSendNotification(
          currentHour,
          user.pending_tasks_time
        );

        if (shouldSendPendingTasksNotification) {
          await sendPendingTasksNotification(supabase, user, results);
        }

        // Check for analytics (weekly on Monday at 8am)
        const shouldSendAnalytics = 
          user.analytics_frequency === 'weekly' && 
          currentDay === 1 && 
          currentHour === 8;

        if (shouldSendAnalytics) {
          await sendAnalyticsNotification(supabase, user, results);
        }
      } catch (userError) {
        console.error(`Error processing user ${setting.user_id}:`, userError);
        const errorMessage = userError instanceof Error ? userError.message : String(userError);
        results.errors.push(`User ${setting.user_id}: ${errorMessage}`);
      }
    }

    console.log('Notification cron job completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Notification cron job error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function shouldSendNotification(currentHour: number, preferredTime: string): boolean {
  const timeMap: Record<string, number> = {
    '8am': 8,
    '9am': 9,
    '10am': 10,
    '12pm': 12,
    '2pm': 14,
    '5pm': 17,
  };

  return timeMap[preferredTime] === currentHour;
}

async function sendPendingTasksNotification(
  supabase: any,
  user: NotificationUser,
  results: any
) {
  // Fetch pending tasks for user's clinics
  const { data: clinicUsers } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.user_id);

  if (!clinicUsers || clinicUsers.length === 0) {
    return;
  }

  const clinicIds = clinicUsers.map((cu: any) => cu.clinic_id);

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, priority, created_at')
    .in('clinic_id', clinicIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (tasksError) {
    throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  }

  if (!tasks || tasks.length === 0) {
    console.log(`No pending tasks for user ${user.user_id}`);
    return;
  }

  console.log(`Found ${tasks.length} pending tasks for user ${user.user_id}`);

  // Send email notification
  if (user.email_enabled) {
    await sendEmailNotification(user, tasks, results);
  }

  // Send SMS notification
  if (user.sms_enabled && user.phone) {
    await sendSmsNotification(user, tasks, results);
  }
}

async function sendAnalyticsNotification(
  supabase: any,
  user: NotificationUser,
  results: any
) {
  // Fetch analytics summary for user's clinics
  const { data: clinicUsers } = await supabase
    .from('clinic_users')
    .select('clinic_id')
    .eq('user_id', user.user_id);

  if (!clinicUsers || clinicUsers.length === 0) {
    return;
  }

  const clinicIds = clinicUsers.map((cu: any) => cu.clinic_id);

  // Get activity logs from the past week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select('type')
    .in('clinic_id', clinicIds)
    .gte('created_at', oneWeekAgo.toISOString());

  if (logsError) {
    throw new Error(`Failed to fetch activity logs: ${logsError.message}`);
  }

  if (!logs || logs.length === 0) {
    console.log(`No analytics data for user ${user.user_id}`);
    return;
  }

  // Aggregate by type
  const analytics = logs.reduce((acc: any, log: any) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});

  console.log(`Sending analytics to user ${user.user_id}:`, analytics);

  // Send email notification
  if (user.email_enabled) {
    await sendAnalyticsEmail(user, analytics, logs.length, results);
  }

  // Send SMS notification
  if (user.sms_enabled && user.phone) {
    await sendAnalyticsSms(user, logs.length, results);
  }
}

async function sendEmailNotification(
  user: NotificationUser,
  tasks: PendingTask[],
  results: any
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const tasksList = tasks
    .map(
      (task) =>
        `<li><strong>${task.title}</strong> (${task.priority} priority) - ${new Date(
          task.created_at
        ).toLocaleDateString('sv-SE')}</li>`
    )
    .join('');

  const emailHtml = `
    <h1>Hej ${user.full_name}!</h1>
    <p>Du har ${tasks.length} väntande uppgift${tasks.length === 1 ? '' : 'er'} att granska:</p>
    <ul>${tasksList}</ul>
    <p>Logga in på Front Office för att hantera dessa uppgifter.</p>
    <p>Med vänliga hälsningar,<br>Front Office</p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Front Office <notifications@resend.dev>',
      to: [user.email],
      subject: `Du har ${tasks.length} väntande uppgift${tasks.length === 1 ? '' : 'er'}`,
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  results.emailsSent++;
  console.log(`Email sent to ${user.email}`);
}

async function sendSmsNotification(
  user: NotificationUser,
  tasks: PendingTask[],
  results: any
) {
  const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
  const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');

  if (!vonageApiKey || !vonageApiSecret) {
    throw new Error('Vonage credentials not configured');
  }

  const message = `Hej ${user.full_name}! Du har ${tasks.length} väntande uppgift${
    tasks.length === 1 ? '' : 'er'
  } att granska i Front Office.`;

  const response = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FrontOffice',
      to: user.phone,
      text: message,
      api_key: vonageApiKey,
      api_secret: vonageApiSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send SMS: ${error}`);
  }

  results.smsSent++;
  console.log(`SMS sent to ${user.phone}`);
}

async function sendAnalyticsEmail(
  user: NotificationUser,
  analytics: Record<string, number>,
  totalInteractions: number,
  results: any
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const analyticsItems = Object.entries(analytics)
    .map(([type, count]) => `<li><strong>${type}</strong>: ${count}</li>`)
    .join('');

  const emailHtml = `
    <h1>Veckorapport - Front Office</h1>
    <p>Hej ${user.full_name}!</p>
    <p>Här är din veckorapport från Front Office:</p>
    <h2>Totalt antal interaktioner: ${totalInteractions}</h2>
    <ul>${analyticsItems}</ul>
    <p>Logga in på Front Office för att se mer detaljerad statistik.</p>
    <p>Med vänliga hälsningar,<br>Front Office</p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Front Office <notifications@resend.dev>',
      to: [user.email],
      subject: 'Din veckorapport från Front Office',
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send analytics email: ${error}`);
  }

  results.emailsSent++;
  console.log(`Analytics email sent to ${user.email}`);
}

async function sendAnalyticsSms(
  user: NotificationUser,
  totalInteractions: number,
  results: any
) {
  const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
  const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');

  if (!vonageApiKey || !vonageApiSecret) {
    throw new Error('Vonage credentials not configured');
  }

  const message = `Din veckorapport från Front Office: ${totalInteractions} interaktioner denna vecka. Logga in för mer detaljer.`;

  const response = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FrontOffice',
      to: user.phone,
      text: message,
      api_key: vonageApiKey,
      api_secret: vonageApiSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send analytics SMS: ${error}`);
  }

  results.smsSent++;
  console.log(`Analytics SMS sent to ${user.phone}`);
}
