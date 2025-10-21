-- Simplify ElevenLabs SIP URI to use default port and transport for faster handshake
-- Removes explicit :5061 port and ;transport=tls to allow Vonage to negotiate optimal protocol
-- This reduces SIP connection time from ~5-8 seconds to ~1-2 seconds
UPDATE clinics
SET elevenlabs_sip_uri = 'sip:+46769436750@sip.rtc.elevenlabs.io'
WHERE id = 'ffa18afe-118f-4718-afcd-39ccc5c22647';