-- Update ElevenLabs SIP URI to use phone number format for inbound calls
-- This changes from agent-based URI (for outbound) to phone-based URI (for inbound)
UPDATE clinics
SET elevenlabs_sip_uri = 'sip:+46769436750@sip.rtc.elevenlabs.io:5061;transport=tls'
WHERE id = 'ffa18afe-118f-4718-afcd-39ccc5c22647';