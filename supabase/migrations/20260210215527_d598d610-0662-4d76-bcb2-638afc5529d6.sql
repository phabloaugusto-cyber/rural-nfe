
-- Tabela de eventos fiscais (cancelamento e carta de correção)
CREATE TABLE public.eventos_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cancelamento', 'carta_correcao')),
  justificativa TEXT NOT NULL,
  protocolo TEXT,
  data_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read eventos_fiscais" ON public.eventos_fiscais FOR SELECT USING (true);
CREATE POLICY "Public insert eventos_fiscais" ON public.eventos_fiscais FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update eventos_fiscais" ON public.eventos_fiscais FOR UPDATE USING (true);
CREATE POLICY "Public delete eventos_fiscais" ON public.eventos_fiscais FOR DELETE USING (true);

-- Tabela de inutilização de numeração
CREATE TABLE public.inutilizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serie TEXT NOT NULL DEFAULT '1',
  numero_inicial INTEGER NOT NULL,
  numero_final INTEGER NOT NULL,
  justificativa TEXT NOT NULL,
  protocolo TEXT,
  ano INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'rejeitado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inutilizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read inutilizacoes" ON public.inutilizacoes FOR SELECT USING (true);
CREATE POLICY "Public insert inutilizacoes" ON public.inutilizacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update inutilizacoes" ON public.inutilizacoes FOR UPDATE USING (true);
CREATE POLICY "Public delete inutilizacoes" ON public.inutilizacoes FOR DELETE USING (true);
