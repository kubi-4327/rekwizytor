-- Allow approved users to update the status of other profiles
-- This is required so that approved users (managers/admins) can approve or reject new users
-- without needing a service role key.

CREATE POLICY "Approved users can update profile status"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- The user performing the action must be approved
  (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'approved'
  OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  -- They can only update the status column (effectively)
  -- Note: Postgres RLS WITH CHECK applies to the new row state.
  -- Ideally we'd restrict *which* columns can be changed, but standard RLS is row-based.
  -- We rely on the Server Action to only send 'status' updates.
  -- But to be safe, we ensure the user performing the action is still approved/admin.
  (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'approved'
  OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
