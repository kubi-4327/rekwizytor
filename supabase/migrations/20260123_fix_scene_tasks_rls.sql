-- Fix RLS for scene_tasks to match other tables (allow approved users)
DROP POLICY IF EXISTS "Users can manage scene tasks" ON scene_tasks;

CREATE POLICY "Approved users can view scene_tasks" 
ON scene_tasks FOR SELECT 
TO authenticated 
USING (
  (SELECT status FROM profiles WHERE id = auth.uid()) = 'approved'
);

CREATE POLICY "Approved users can insert scene_tasks" 
ON scene_tasks FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT status FROM profiles WHERE id = auth.uid()) = 'approved'
);

CREATE POLICY "Approved users can update scene_tasks" 
ON scene_tasks FOR UPDATE 
TO authenticated 
USING (
  (SELECT status FROM profiles WHERE id = auth.uid()) = 'approved'
);

CREATE POLICY "Approved users can delete scene_tasks" 
ON scene_tasks FOR DELETE 
TO authenticated 
USING (
  (SELECT status FROM profiles WHERE id = auth.uid()) = 'approved'
);
