-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS on_draft_reply_created ON public.draft_replies;