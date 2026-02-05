-- Add new columns to staff_profiles for enhanced employee information

-- Add contact information columns
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS start_date date;

-- Create a job_title enum for restaurant-specific roles
DO $$ BEGIN
    CREATE TYPE public.job_title AS ENUM (
        -- Service (Front of House)
        'server',
        'host',
        'bartender',
        'barback',
        'busser',
        'food_runner',
        -- Kitchen (Back of House)
        'head_chef',
        'sous_chef',
        'line_cook',
        'prep_cook',
        'dishwasher',
        'kitchen_porter',
        -- Bar
        'bar_manager',
        'mixologist',
        -- Management
        'general_manager',
        'assistant_manager',
        'shift_supervisor',
        'floor_manager'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the staff_role enum to include 'bar' department
-- First check if 'bar' already exists
DO $$ BEGIN
    ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'bar';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add job_title column to staff_profiles
ALTER TABLE public.staff_profiles 
ADD COLUMN IF NOT EXISTS job_title public.job_title;