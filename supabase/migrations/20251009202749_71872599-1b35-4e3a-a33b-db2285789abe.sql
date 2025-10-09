-- Remove incorrect bokadirekt integration records
DELETE FROM public.clinic_integrations 
WHERE integration_type = 'bokadirekt';