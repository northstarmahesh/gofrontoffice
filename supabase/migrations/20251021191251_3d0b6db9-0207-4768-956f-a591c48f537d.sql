-- Optimize ElevenLabs SIP URI with explicit port 5061 (TLS implicit) but without transport parameter
-- Port 5061 is standard for SIP over TLS (RFC 5630), removing ;transport=tls allows faster negotiation
-- This reduces SIP connection time while maintaining security
UPDATE clinics
SET elevenlabs_sip_uri = 'sip:+46769436750@sip.rtc.elevenlabs.io:5061'
WHERE id = 'ffa18afe-118f-4718-afcd-39ccc5c22647';