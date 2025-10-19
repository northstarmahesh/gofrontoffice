-- Fix invalid phone number format (remove leading zeros after +)
UPDATE clinic_phone_numbers 
SET phone_number = '+40751500920' 
WHERE phone_number = '+0751500920';