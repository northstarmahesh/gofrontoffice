-- Ensure ElevenLabs SIP uses TLS explicitly on 5061
UPDATE public.clinics
SET elevenlabs_sip_uri = 'sip:+46769436750@sip.rtc.elevenlabs.io:5061;transport=tls'
WHERE id = 'ffa18afe-118f-4718-afcd-39ccc5c22647';