-- Multi-Model Embeddings Storage
-- Each model gets its own JSONB column with structure: {identity: [...], physical: [...], context: [...]}

-- Add columns for different embedding models
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS embeddings_gemini JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS embeddings_mistral JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS embeddings_openai_large JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS embeddings_openai_small JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS embeddings_voyage_large JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS embeddings_voyage_lite JSONB DEFAULT NULL;

-- Add indexes for faster access
CREATE INDEX IF NOT EXISTS idx_groups_embeddings_gemini ON groups USING GIN (embeddings_gemini);
CREATE INDEX IF NOT EXISTS idx_groups_embeddings_mistral ON groups USING GIN (embeddings_mistral);
CREATE INDEX IF NOT EXISTS idx_groups_embeddings_openai_large ON groups USING GIN (embeddings_openai_large);
CREATE INDEX IF NOT EXISTS idx_groups_embeddings_openai_small ON groups USING GIN (embeddings_openai_small);
CREATE INDEX IF NOT EXISTS idx_groups_embeddings_voyage_large ON groups USING GIN (embeddings_voyage_large);
CREATE INDEX IF NOT EXISTS idx_groups_embeddings_voyage_lite ON groups USING GIN (embeddings_voyage_lite);

-- Migrate existing Gemini embeddings from vector columns to JSONB
UPDATE groups 
SET embeddings_gemini = jsonb_build_object(
    'identity', to_jsonb(embedding_identity::text::float[]),
    'physical', to_jsonb(embedding_physical::text::float[]),
    'context', to_jsonb(embedding_context::text::float[])
)
WHERE embedding_identity IS NOT NULL
  AND embeddings_gemini IS NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN groups.embeddings_gemini IS 'Gemini embeddings: {identity: number[], physical: number[], context: number[]}';
COMMENT ON COLUMN groups.embeddings_mistral IS 'Mistral embeddings: {identity: number[], physical: number[], context: number[]}';
COMMENT ON COLUMN groups.embeddings_openai_large IS 'OpenAI Large embeddings: {identity: number[], physical: number[], context: number[]}';
COMMENT ON COLUMN groups.embeddings_openai_small IS 'OpenAI Small embeddings: {identity: number[], physical: number[], context: number[]}';
COMMENT ON COLUMN groups.embeddings_voyage_large IS 'Voyage Large embeddings: {identity: number[], physical: number[], context: number[]}';
COMMENT ON COLUMN groups.embeddings_voyage_lite IS 'Voyage Lite embeddings: {identity: number[], physical: number[], context: number[]}';
