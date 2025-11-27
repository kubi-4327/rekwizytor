-- Enable pgvector extension
create extension if not exists vector;

-- Add embedding column to items table
alter table items 
add column if not exists embedding vector(768);

-- Create index for faster similarity search
create index if not exists items_embedding_idx 
on items 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create function for similarity search
create or replace function match_items(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  name text,
  location_id uuid,
  group_id uuid,
  image_url text,
  similarity float
)
language sql stable
as $$
  select
    items.id,
    items.name,
    items.location_id,
    items.group_id,
    items.image_url,
    1 - (items.embedding <=> query_embedding) as similarity
  from items
  where 1 - (items.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
