-- Create table for bootcamp applications
CREATE TABLE public.bootcamp_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  age TEXT,
  email TEXT,
  linkedin TEXT,
  about TEXT,
  motivation TEXT,
  goal TEXT,
  app_experience TEXT,
  ai_experience TEXT,
  preferred_time TEXT,
  unavailable_days TEXT,
  referral_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bootcamp_applications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert applications (no auth required)
CREATE POLICY "Anyone can insert applications" 
ON public.bootcamp_applications 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow viewing all applications (for admin purposes)
CREATE POLICY "Anyone can view applications" 
ON public.bootcamp_applications 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bootcamp_applications_updated_at
BEFORE UPDATE ON public.bootcamp_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();