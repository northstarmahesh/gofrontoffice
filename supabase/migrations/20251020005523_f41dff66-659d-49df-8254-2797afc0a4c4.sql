-- Create trigger to automatically create tasks from draft replies
CREATE TRIGGER trigger_create_task_from_draft
  AFTER INSERT ON public.draft_replies
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.create_task_from_draft();