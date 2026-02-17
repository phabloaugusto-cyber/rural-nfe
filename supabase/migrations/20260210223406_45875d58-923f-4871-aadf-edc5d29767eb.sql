
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for all tables

-- clientes
DROP POLICY IF EXISTS "Public delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public read clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public update clientes" ON public.clientes;

CREATE POLICY "Allow all select clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Allow all insert clientes" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update clientes" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "Allow all delete clientes" ON public.clientes FOR DELETE USING (true);

-- emitentes
DROP POLICY IF EXISTS "Public delete emitentes" ON public.emitentes;
DROP POLICY IF EXISTS "Public insert emitentes" ON public.emitentes;
DROP POLICY IF EXISTS "Public read emitentes" ON public.emitentes;
DROP POLICY IF EXISTS "Public update emitentes" ON public.emitentes;

CREATE POLICY "Allow all select emitentes" ON public.emitentes FOR SELECT USING (true);
CREATE POLICY "Allow all insert emitentes" ON public.emitentes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update emitentes" ON public.emitentes FOR UPDATE USING (true);
CREATE POLICY "Allow all delete emitentes" ON public.emitentes FOR DELETE USING (true);

-- eventos_fiscais
DROP POLICY IF EXISTS "Public delete eventos_fiscais" ON public.eventos_fiscais;
DROP POLICY IF EXISTS "Public insert eventos_fiscais" ON public.eventos_fiscais;
DROP POLICY IF EXISTS "Public read eventos_fiscais" ON public.eventos_fiscais;
DROP POLICY IF EXISTS "Public update eventos_fiscais" ON public.eventos_fiscais;

CREATE POLICY "Allow all select eventos_fiscais" ON public.eventos_fiscais FOR SELECT USING (true);
CREATE POLICY "Allow all insert eventos_fiscais" ON public.eventos_fiscais FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update eventos_fiscais" ON public.eventos_fiscais FOR UPDATE USING (true);
CREATE POLICY "Allow all delete eventos_fiscais" ON public.eventos_fiscais FOR DELETE USING (true);

-- inscricoes_estaduais
DROP POLICY IF EXISTS "Public delete inscricoes" ON public.inscricoes_estaduais;
DROP POLICY IF EXISTS "Public insert inscricoes" ON public.inscricoes_estaduais;
DROP POLICY IF EXISTS "Public read inscricoes" ON public.inscricoes_estaduais;
DROP POLICY IF EXISTS "Public update inscricoes" ON public.inscricoes_estaduais;

CREATE POLICY "Allow all select inscricoes_estaduais" ON public.inscricoes_estaduais FOR SELECT USING (true);
CREATE POLICY "Allow all insert inscricoes_estaduais" ON public.inscricoes_estaduais FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update inscricoes_estaduais" ON public.inscricoes_estaduais FOR UPDATE USING (true);
CREATE POLICY "Allow all delete inscricoes_estaduais" ON public.inscricoes_estaduais FOR DELETE USING (true);

-- inutilizacoes
DROP POLICY IF EXISTS "Public delete inutilizacoes" ON public.inutilizacoes;
DROP POLICY IF EXISTS "Public insert inutilizacoes" ON public.inutilizacoes;
DROP POLICY IF EXISTS "Public read inutilizacoes" ON public.inutilizacoes;
DROP POLICY IF EXISTS "Public update inutilizacoes" ON public.inutilizacoes;

CREATE POLICY "Allow all select inutilizacoes" ON public.inutilizacoes FOR SELECT USING (true);
CREATE POLICY "Allow all insert inutilizacoes" ON public.inutilizacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update inutilizacoes" ON public.inutilizacoes FOR UPDATE USING (true);
CREATE POLICY "Allow all delete inutilizacoes" ON public.inutilizacoes FOR DELETE USING (true);

-- mercadorias
DROP POLICY IF EXISTS "Public delete mercadorias" ON public.mercadorias;
DROP POLICY IF EXISTS "Public insert mercadorias" ON public.mercadorias;
DROP POLICY IF EXISTS "Public read mercadorias" ON public.mercadorias;
DROP POLICY IF EXISTS "Public update mercadorias" ON public.mercadorias;

CREATE POLICY "Allow all select mercadorias" ON public.mercadorias FOR SELECT USING (true);
CREATE POLICY "Allow all insert mercadorias" ON public.mercadorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update mercadorias" ON public.mercadorias FOR UPDATE USING (true);
CREATE POLICY "Allow all delete mercadorias" ON public.mercadorias FOR DELETE USING (true);

-- nfe_itens
DROP POLICY IF EXISTS "Public delete nfe_itens" ON public.nfe_itens;
DROP POLICY IF EXISTS "Public insert nfe_itens" ON public.nfe_itens;
DROP POLICY IF EXISTS "Public read nfe_itens" ON public.nfe_itens;
DROP POLICY IF EXISTS "Public update nfe_itens" ON public.nfe_itens;

CREATE POLICY "Allow all select nfe_itens" ON public.nfe_itens FOR SELECT USING (true);
CREATE POLICY "Allow all insert nfe_itens" ON public.nfe_itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update nfe_itens" ON public.nfe_itens FOR UPDATE USING (true);
CREATE POLICY "Allow all delete nfe_itens" ON public.nfe_itens FOR DELETE USING (true);

-- notas_fiscais
DROP POLICY IF EXISTS "Public delete notas" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Public insert notas" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Public read notas" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Public update notas" ON public.notas_fiscais;

CREATE POLICY "Allow all select notas_fiscais" ON public.notas_fiscais FOR SELECT USING (true);
CREATE POLICY "Allow all insert notas_fiscais" ON public.notas_fiscais FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update notas_fiscais" ON public.notas_fiscais FOR UPDATE USING (true);
CREATE POLICY "Allow all delete notas_fiscais" ON public.notas_fiscais FOR DELETE USING (true);

-- transportadoras
DROP POLICY IF EXISTS "Public delete transportadoras" ON public.transportadoras;
DROP POLICY IF EXISTS "Public insert transportadoras" ON public.transportadoras;
DROP POLICY IF EXISTS "Public read transportadoras" ON public.transportadoras;
DROP POLICY IF EXISTS "Public update transportadoras" ON public.transportadoras;

CREATE POLICY "Allow all select transportadoras" ON public.transportadoras FOR SELECT USING (true);
CREATE POLICY "Allow all insert transportadoras" ON public.transportadoras FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update transportadoras" ON public.transportadoras FOR UPDATE USING (true);
CREATE POLICY "Allow all delete transportadoras" ON public.transportadoras FOR DELETE USING (true);
