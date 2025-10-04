-- Create function to automatically create a task when a draft reply is created
CREATE OR REPLACE FUNCTION public.create_task_from_draft()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_activity_log activity_logs%ROWTYPE;
  v_task_title text;
  v_task_description text;
BEGIN
  -- Get the related activity log details
  SELECT * INTO v_activity_log
  FROM activity_logs
  WHERE id = NEW.log_id;

  -- Build task title based on activity type
  v_task_title := CASE 
    WHEN v_activity_log.type = 'whatsapp' THEN 'Review WhatsApp message from ' || COALESCE(v_activity_log.contact_name, v_activity_log.contact_info)
    WHEN v_activity_log.type = 'sms' THEN 'Review SMS from ' || COALESCE(v_activity_log.contact_name, v_activity_log.contact_info)
    WHEN v_activity_log.type = 'instagram' THEN 'Review Instagram message from ' || COALESCE(v_activity_log.contact_name, v_activity_log.contact_info)
    WHEN v_activity_log.type = 'messenger' THEN 'Review Messenger message from ' || COALESCE(v_activity_log.contact_name, v_activity_log.contact_info)
    WHEN v_activity_log.type = 'call' THEN 'Review call summary from ' || COALESCE(v_activity_log.contact_name, v_activity_log.contact_info)
    ELSE 'Review message from ' || COALESCE(v_activity_log.contact_name, v_activity_log.contact_info)
  END;

  -- Build task description
  v_task_description := 'AI has drafted a response. Please review and send or edit as needed.';

  -- Create the task
  INSERT INTO tasks (
    user_id,
    clinic_id,
    title,
    description,
    status,
    priority,
    source,
    related_log_id
  ) VALUES (
    NEW.user_id,
    NEW.clinic_id,
    v_task_title,
    v_task_description,
    'pending',
    'high',
    v_activity_log.type,
    NEW.log_id
  );

  RETURN NEW;
END;
$function$;

-- Create trigger that fires when a draft_reply is inserted
CREATE TRIGGER on_draft_reply_created
  AFTER INSERT ON draft_replies
  FOR EACH ROW
  EXECUTE FUNCTION create_task_from_draft();