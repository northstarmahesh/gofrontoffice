-- Add demo mode flag to clinics for testing purposes
ALTER TABLE public.clinics
ADD COLUMN is_demo_account BOOLEAN DEFAULT false;

-- Update the demo clinic for mahesh@gonorthstar.ai
-- First we need to find if mahesh's user exists and has a clinic
UPDATE public.clinics
SET is_demo_account = true
WHERE admin_email = 'mahesh@gonorthstar.ai'
   OR email = 'mahesh@gonorthstar.ai';