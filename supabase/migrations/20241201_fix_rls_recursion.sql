-- Create a security definer function to check if the user is an admin
-- This bypasses RLS to avoid infinite recursion when querying profiles within a profiles policy
CREATE OR REPLACE FUNCTION public.is_admin()
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
    AND role = 'admin'
  );
END;
$$;

-- Update policies to use the new function

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can modify user status and role" ON public.profiles;

-- Re-create policies using is_admin()

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_admin()
);

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_admin()
);

-- Note: The check constraint for updating status/role was previously in a separate policy or the same one.
-- Let's ensure we cover the requirement: "Only admins can modify user status and role"
-- The previous policy likely had a USING clause and a WITH CHECK clause.
-- If we want to allow admins to update ANY column, the above "Admins can update all profiles" covers it.
-- But we also want to ensure that non-admins CANNOT update status/role.
-- The "Users can update own basic profile" policy handles the user side (restricting columns).
-- So for admins, we just need to allow them to update everything.

-- However, we should double check "Users can update own basic profile" to ensure it doesn't allow status/role changes.
-- Previous policy:
-- USING (auth.uid() = id)
-- WITH CHECK (
--   auth.uid() = id AND
--   status = (SELECT status FROM profiles WHERE id = auth.uid()) AND
--   role = (SELECT role FROM profiles WHERE id = auth.uid())
-- )
-- This previous user policy ALSO caused recursion because of the subselects in WITH CHECK!

-- We need to fix the user policy too.
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;

CREATE POLICY "Users can update own basic profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id AND
  -- Ensure status and role are NOT changed
  -- We can't easily compare with "old" value in WITH CHECK without selecting (recursion).
  -- But we can check if the NEW value matches the CURRENT value in the DB? No, that's the same.
  -- Actually, WITH CHECK receives the NEW row.
  -- We want to prevent the user from setting status='approved' or role='admin'.
  -- But valid values are what they are currently.
  
  -- Alternative approach: Don't use RLS for column-level security if it causes recursion.
  -- OR use the is_admin() function to allow everything, and for non-admins, rely on a trigger?
  -- OR, simply trust that the UI doesn't send these fields, and RLS prevents "unauthorized" changes?
  -- No, RLS must enforce it.
  
  -- Let's try to use a function that gets the current row without triggering RLS?
  -- No, that's hard.
  
  -- Better approach for User policy:
  -- Allow update if they are NOT trying to change status or role to something privileged.
  -- But they could change "pending" to "approved".
  
  -- Let's look at how we can check "old" values. We can't in RLS directly.
  -- But we can check if the new status is 'pending' (if they were pending) or... no.
  
  -- Let's stick to the Admin policies first, which are the main blocker for LOGIN (SELECT).
  -- The SELECT recursion is the critical one blocking middleware.
  -- The UPDATE recursion blocks saving profile.
  
  -- For the User Update policy, let's simplify it for now to avoid recursion:
  -- Just check that they are updating their own ID.
  -- AND we rely on the fact that our API/Server Actions don't expose status/role update to users.
  -- AND we can add a Trigger to prevent status/role changes by non-admins.
  -- A Trigger is safer and doesn't cause RLS recursion.
  
  -- So, let's replace "Users can update own basic profile" with a simple ID check,
  -- and add a Trigger to protect sensitive columns.
);

CREATE POLICY "Users can update own basic profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

-- Create a trigger function to protect sensitive columns
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is NOT an admin, they cannot change status or role
  IF NOT public.is_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'You are not authorized to change status';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'You are not authorized to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;

CREATE TRIGGER protect_profile_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_fields();
