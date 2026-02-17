ALTER TABLE public.notas_fiscais
  ADD COLUMN transportador_nome text,
  ADD COLUMN transportador_cpf_cnpj text,
  ADD COLUMN transportador_placa text,
  ADD COLUMN transportador_uf text,
  ADD COLUMN transportador_rntrc text;