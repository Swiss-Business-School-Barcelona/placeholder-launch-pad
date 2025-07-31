-- Add UPDATE policy for bootcamp_applications table
CREATE POLICY "Anyone can update applications" 
ON public.bootcamp_applications 
FOR UPDATE 
USING (true) 
WITH CHECK (true);