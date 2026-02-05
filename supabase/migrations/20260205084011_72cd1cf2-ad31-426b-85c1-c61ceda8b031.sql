-- Add UK tax and NIC fields to staff_profiles
ALTER TABLE public.staff_profiles
ADD COLUMN tax_code text DEFAULT '1257L',
ADD COLUMN nic_category text DEFAULT 'A';

-- Add comment for documentation
COMMENT ON COLUMN public.staff_profiles.tax_code IS 'UK PAYE tax code (e.g., 1257L, BR, 0T)';
COMMENT ON COLUMN public.staff_profiles.nic_category IS 'National Insurance contribution category letter (A, B, C, F, H, J, M, V, Z)';