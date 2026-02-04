-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager');

-- Create staff role enum
CREATE TYPE public.staff_role AS ENUM ('kitchen', 'floor', 'management');

-- Create contract type enum
CREATE TYPE public.contract_type AS ENUM ('salaried', 'zero_rate');

-- Create user_roles table for Admin/Manager access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create staff_profiles table
CREATE TABLE public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  profile_photo_url TEXT,
  role staff_role NOT NULL DEFAULT 'floor',
  contract_type contract_type NOT NULL DEFAULT 'zero_rate',
  ni_number TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on staff_profiles
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Create helper function to check if user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'manager')
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_staff_profiles_updated_at
BEFORE UPDATE ON public.staff_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.is_admin());

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.is_admin());

-- RLS Policies for staff_profiles table
-- Admins can view all staff profiles (including NI numbers)
CREATE POLICY "Admins can view all staff profiles"
  ON public.staff_profiles
  FOR SELECT
  USING (public.is_admin());

-- Managers can view staff profiles
CREATE POLICY "Managers can view staff profiles"
  ON public.staff_profiles
  FOR SELECT
  USING (public.is_manager());

-- Staff can view their own profile
CREATE POLICY "Staff can view own profile"
  ON public.staff_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can insert staff profiles
CREATE POLICY "Admins can insert staff profiles"
  ON public.staff_profiles
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins can update all staff profiles
CREATE POLICY "Admins can update all staff profiles"
  ON public.staff_profiles
  FOR UPDATE
  USING (public.is_admin());

-- Managers can update basic staff info (not NI number or contract type)
CREATE POLICY "Managers can update basic staff info"
  ON public.staff_profiles
  FOR UPDATE
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Only admins can delete staff profiles
CREATE POLICY "Admins can delete staff profiles"
  ON public.staff_profiles
  FOR DELETE
  USING (public.is_admin());

-- Create a view for manager access (excludes NI number)
CREATE VIEW public.staff_profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  name,
  profile_photo_url,
  role,
  contract_type,
  hourly_rate,
  created_at,
  updated_at
FROM public.staff_profiles;