
-- Create veiculos table linked to transportadoras
CREATE TABLE public.veiculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportadora_id UUID NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  uf_placa TEXT NOT NULL,
  rntrc TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all select veiculos" ON public.veiculos FOR SELECT USING (true);
CREATE POLICY "Allow all insert veiculos" ON public.veiculos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update veiculos" ON public.veiculos FOR UPDATE USING (true);
CREATE POLICY "Allow all delete veiculos" ON public.veiculos FOR DELETE USING (true);

-- Migrate existing data from transportadoras to veiculos
INSERT INTO public.veiculos (transportadora_id, placa, uf_placa, rntrc)
SELECT id, placa, uf_placa, rntrc FROM public.transportadoras;

-- Remove vehicle columns from transportadoras (keep nome and cpf_cnpj)
ALTER TABLE public.transportadoras DROP COLUMN placa;
ALTER TABLE public.transportadoras DROP COLUMN uf_placa;
ALTER TABLE public.transportadoras DROP COLUMN rntrc;
