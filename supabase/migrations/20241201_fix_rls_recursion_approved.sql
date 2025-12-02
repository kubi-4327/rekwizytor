-- Create a security definer function to check if the user is approved
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'approved'
  );
END;
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Approved users can view all profiles" ON public.profiles;

-- Re-create it using the secure function
CREATE POLICY "Approved users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_approved()
);
