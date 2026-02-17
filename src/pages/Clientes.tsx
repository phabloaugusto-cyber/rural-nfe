import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Cliente, InscricaoEstadual } from "@/types/cliente";
import { supabase } from "@/integrations/supabase/client";

const estadosBR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const emptyIE = (): InscricaoEstadual => ({
  id: String(Date.now()),
  numero: "",
  uf: "",
  propriedade: "",
  cidade: "",
  estado: "",
  cep: "",
});

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [inscricoes, setInscricoes] = useState<InscricaoEstadual[]>([emptyIE()]);

  const fetchClientes = async () => {
    setLoading(true);
    const { data: clientesData, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar clientes.");
      setLoading(false);
      return;
    }

    // Fetch inscricoes for all clients
    const { data: inscricoesData, error: ieError } = await supabase
      .from("inscricoes_estaduais")
      .select("*");

    if (ieError) {
      toast.error("Erro ao carregar inscrições estaduais.");
    }

    const mapped: Cliente[] = (clientesData || []).map(c => ({
      id: c.id,
      nome: c.nome,
      cpf: c.cpf,
      inscricoesEstaduais: (inscricoesData || [])
        .filter(ie => ie.cliente_id === c.id)
        .map(ie => ({
          id: ie.id,
          numero: ie.numero,
          uf: ie.uf,
          propriedade: ie.propriedade,
          cidade: ie.cidade,
          estado: ie.estado,
          cep: ie.cep || "",
        })),
    }));

    setClientes(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const resetForm = () => {
    setNome(""); setCpf("");
    setInscricoes([emptyIE()]);
    setEditingId(null);
    setShowForm(false);
  };

  const editCliente = (c: Cliente) => {
    setNome(c.nome); setCpf(c.cpf);
    setInscricoes(c.inscricoesEstaduais.length > 0 ? c.inscricoesEstaduais : [emptyIE()]);
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !cpf.trim()) {
      toast.error("Nome e CPF são obrigatórios.");
      return;
    }

    const ieValidas = inscricoes.filter(ie => ie.numero.trim());

    if (editingId) {
      // Update client
      const { error } = await supabase
        .from("clientes")
        .update({ nome, cpf })
        .eq("id", editingId);

      if (error) {
        toast.error("Erro ao atualizar cliente.");
        return;
      }

      // Delete old IEs and re-insert
      await supabase.from("inscricoes_estaduais").delete().eq("cliente_id", editingId);

      if (ieValidas.length > 0) {
        const { error: ieError } = await supabase.from("inscricoes_estaduais").insert(
          ieValidas.map(ie => ({
            cliente_id: editingId,
            numero: ie.numero,
            uf: ie.uf,
            propriedade: ie.propriedade,
            cidade: ie.cidade,
            estado: ie.estado,
            cep: ie.cep || null,
          }))
        );
        if (ieError) {
          toast.error("Erro ao salvar inscrições estaduais.");
          return;
        }
      }

      toast.success("Cliente atualizado!");
    } else {
      // Insert new client
      const { data: newCliente, error } = await supabase
        .from("clientes")
        .insert({ nome, cpf })
        .select()
        .single();

      if (error || !newCliente) {
        toast.error("Erro ao cadastrar cliente.");
        return;
      }

      if (ieValidas.length > 0) {
        const { error: ieError } = await supabase.from("inscricoes_estaduais").insert(
          ieValidas.map(ie => ({
            cliente_id: newCliente.id,
            numero: ie.numero,
            uf: ie.uf,
            propriedade: ie.propriedade,
            cidade: ie.cidade,
            estado: ie.estado,
            cep: ie.cep || null,
          }))
        );
        if (ieError) {
          toast.error("Erro ao salvar inscrições estaduais.");
          return;
        }
      }

      toast.success("Cliente cadastrado!");
    }

    resetForm();
    fetchClientes();
  };

  const deleteCliente = async (id: string) => {
    // Delete IEs first (foreign key)
    await supabase.from("inscricoes_estaduais").delete().eq("cliente_id", id);
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover cliente.");
      return;
    }
    toast.success("Cliente removido.");
    fetchClientes();
  };

  const addIE = () => {
    setInscricoes([...inscricoes, emptyIE()]);
  };

  const removeIE = (id: string) => {
    if (inscricoes.length <= 1) return;
    setInscricoes(inscricoes.filter(ie => ie.id !== id));
  };

  const updateIE = (id: string, field: keyof InscricaoEstadual, value: string) => {
    setInscricoes(inscricoes.map(ie => ie.id === id ? { ...ie, [field]: value } : ie));
  };

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.cpf.includes(busca) ||
    c.inscricoesEstaduais.some(ie => ie.propriedade.toLowerCase().includes(busca.toLowerCase()))
  );

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground">Remetentes e destinatários de NF-e</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6 animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Editar Cliente" : "Novo Cliente"}
            </h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" className="mt-1" />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" className="mt-1" />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">Inscrições Estaduais e Propriedades</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIE}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar IE
              </Button>
            </div>
            <div className="space-y-4">
              {inscricoes.map((ie, idx) => (
                <div key={ie.id} className="rounded-md border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">IE {idx + 1}</span>
                    {inscricoes.length > 1 && (
                      <button onClick={() => removeIE(ie.id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label className="text-xs">Nº Inscrição Estadual</Label>
                      <Input value={ie.numero} onChange={e => updateIE(ie.id, "numero", e.target.value)} placeholder="000.000.000" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">UF</Label>
                      <select value={ie.uf} onChange={e => updateIE(ie.id, "uf", e.target.value)} className={`mt-1 ${selectClasses}`}>
                        <option value="">UF</option>
                        {estadosBR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Propriedade</Label>
                      <Input value={ie.propriedade} onChange={e => updateIE(ie.id, "propriedade", e.target.value)} placeholder="Nome da fazenda" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Cidade</Label>
                      <Input value={ie.cidade} onChange={e => updateIE(ie.id, "cidade", e.target.value)} placeholder="Cidade" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Estado</Label>
                      <select value={ie.estado} onChange={e => updateIE(ie.id, "estado", e.target.value)} className={`mt-1 ${selectClasses}`}>
                        <option value="">UF</option>
                        {estadosBR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">CEP</Label>
                      <Input value={ie.cep} onChange={e => updateIE(ie.id, "cep", e.target.value)} placeholder="00000-000" className="mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </div>
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF ou propriedade..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">CPF</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">IEs / Propriedades</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.cpf}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="space-y-1">
                      {c.inscricoesEstaduais.map(ie => (
                        <div key={ie.id} className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                            {ie.numero} ({ie.uf})
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {ie.propriedade} — {ie.cidade}/{ie.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => editCliente(c)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Editar</button>
                      <button onClick={() => deleteCliente(c.id)} className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
};

export default Clientes;
