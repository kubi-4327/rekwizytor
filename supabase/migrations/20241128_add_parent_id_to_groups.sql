-- Add parent_id to groups table for hierarchical structure
ALTER TABLE public.groups
ADD COLUMN parent_id UUID REFERENCES public.groups(id);

-- Add index for performance
CREATE INDEX idx_groups_parent_id ON public.groups(parent_id);
