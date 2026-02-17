
ALTER TABLE public.emitentes
ADD COLUMN serie text NOT NULL DEFAULT '1',
ADD COLUMN numero_nota_atual integer NOT NULL DEFAULT 1;
