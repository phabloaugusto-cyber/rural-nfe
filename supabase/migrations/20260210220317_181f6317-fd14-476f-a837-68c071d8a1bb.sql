
-- Adicionar campos de autorização SEFAZ à tabela notas_fiscais
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS chave_acesso TEXT,
  ADD COLUMN IF NOT EXISTS protocolo_autorizacao TEXT;
