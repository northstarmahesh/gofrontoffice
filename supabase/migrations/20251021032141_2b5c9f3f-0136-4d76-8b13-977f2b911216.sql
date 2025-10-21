-- Fix ElevenLabs SIP URI to include agent ID
-- Current issue: URI only has host, missing user part
-- Correct format: sip:agent_id@host:port;transport=tls

UPDATE clinics 
SET elevenlabs_sip_uri = 'sip:agent_8401k825b6qffxbvdsf4pj0wcchw@sip.rtc.elevenlabs.io:5061;transport=tls',
    updated_at = now()
WHERE id = 'ffa18afe-118f-4718-afcd-39ccc5c22647'
  AND elevenlabs_agent_id = 'agent_8401k825b6qffxbvdsf4pj0wcchw';