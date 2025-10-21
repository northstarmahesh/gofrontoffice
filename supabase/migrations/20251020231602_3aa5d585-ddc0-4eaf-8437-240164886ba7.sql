-- Add Eleven Labs columns to clinics table
ALTER TABLE public.clinics
ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT,
ADD COLUMN IF NOT EXISTS elevenlabs_sip_uri TEXT,
ADD COLUMN IF NOT EXISTS elevenlabs_voice_1_id TEXT DEFAULT '4xkUqaR9MYOJHoaC1Nak',
ADD COLUMN IF NOT EXISTS elevenlabs_voice_2_id TEXT DEFAULT 'hMTrLL2ZiyJiyKrdg2z4',
ADD COLUMN IF NOT EXISTS elevenlabs_voice_3_id TEXT DEFAULT 'RILOU7YmBhvwJGDGjNmP',
ADD COLUMN IF NOT EXISTS selected_elevenlabs_voice_id TEXT DEFAULT '4xkUqaR9MYOJHoaC1Nak';

-- Add comments
COMMENT ON COLUMN public.clinics.elevenlabs_agent_id IS 'Eleven Labs agent ID for this clinic';
COMMENT ON COLUMN public.clinics.elevenlabs_sip_uri IS 'SIP URI for forwarding calls to Eleven Labs (e.g., sip:agent_xxx@sip.rtc.elevenlabs.io:5060;transport=tcp)';
COMMENT ON COLUMN public.clinics.elevenlabs_voice_1_id IS 'First Swedish voice option';
COMMENT ON COLUMN public.clinics.elevenlabs_voice_2_id IS 'Second Swedish voice option';
COMMENT ON COLUMN public.clinics.elevenlabs_voice_3_id IS 'Third Swedish voice option';
COMMENT ON COLUMN public.clinics.selected_elevenlabs_voice_id IS 'Currently selected voice ID';