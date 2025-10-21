-- Update Moonrise Health clinic to use new ElevenLabs SIP endpoint
-- This uses the TLS endpoint which is more reliable than TCP
UPDATE clinics 
SET elevenlabs_sip_uri = 'sip:sip.rtc.elevenlabs.io:5061;transport=tls',
    updated_at = now()
WHERE id = 'ffa18afe-118f-4718-afcd-39ccc5c22647'
  AND elevenlabs_sip_uri LIKE '%sip.rtc.elevenlabs.io:5060%';