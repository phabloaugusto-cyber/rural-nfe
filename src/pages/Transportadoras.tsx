import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Plus, Trash2, X, Truck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Transportadora, Veiculo } from "@/types/transportadora";
import { supabase } from "@/integrations/supabase/client";

const estadosBR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const emptyVeiculo = (): Veiculo => ({
  id: String(Date.now()),
  placa: "",
  ufPlaca: "",
  rntrc: "",
});

const Transportadoras = () => {
  const [lista, setLista] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [veiculos, setVeiculos] = useState<Veiculo[]>([emptyVeiculo()]);

  const fetchData = async () => {
    setLoading(true);
    const [transRes, veicRes] = await Promise.all([
      supabase.from("transportadoras").select("*").order("nome"),
      supabase.from("veiculos").select("*"),
    ]);

    if (transRes.error) { toast.error("Erro ao carregar transportadoras."); console.error(transRes.error); }
    
    const veiculosData = veicRes.data || [];
    const mapped: Transportadora[] = (transRes.data || []).map(t => ({
      id: t.id,
      nome: t.nome,
      cpfCnpj: t.cpf_cnpj,
      veiculos: veiculosData
        .filter(v => v.transportadora_id === t.id)
        .map(v => ({ id: v.id, placa: v.placa, ufPlaca: v.uf_placa, rntrc: v.rntrc || undefined })),
    }));

    setLista(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setNome(""); setCpfCnpj("");
    setVeiculos([emptyVeiculo()]);
    setEditingId(null); setShowForm(false);
  };

  const edit = (t: Transportadora) => {
    setNome(t.nome); setCpfCnpj(t.cpfCnpj);
    setVeiculos(t.veiculos.length > 0 ? t.veiculos : [emptyVeiculo()]);
    setEditingId(t.id); setShowForm(true);
  };

  const addVeiculo = () => setVeiculos([...veiculos, emptyVeiculo()]);
  const removeVeiculo = (id: string) => { if (veiculos.length <= 1) return; setVeiculos(veiculos.filter(v => v.id !== id)); };
  const updateVeiculo = (id: string, field: keyof Veiculo, value: string) => {
    setVeiculos(veiculos.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    const veiculosValidos = veiculos.filter(v => v.placa.trim());
    if (veiculosValidos.length === 0) { toast.error("Cadastre pelo menos um veículo com placa."); return; }
    setSaving(true);

    const payload = { nome, cpf_cnpj: cpfCnpj };

    if (editingId) {
      const { error } = await supabase.from("transportadoras").update(payload).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar."); console.error(error); setSaving(false); return; }

      // Delete old vehicles and re-insert
      await supabase.from("veiculos").delete().eq("transportadora_id", editingId);
      if (veiculosValidos.length > 0) {
        const { error: vErr } = await supabase.from("veiculos").insert(
          veiculosValidos.map(v => ({ transportadora_id: editingId, placa: v.placa, uf_placa: v.ufPlaca, rntrc: v.rntrc || null }))
        );
        if (vErr) { toast.error("Erro ao salvar veículos."); console.error(vErr); }
      }
      toast.success("Transportadora atualizada!");
    } else {
      const { data: newT, error } = await supabase.from("transportadoras").insert(payload).select("id").single();
      if (error || !newT) { toast.error("Erro ao cadastrar."); console.error(error); setSaving(false); return; }

      if (veiculosValidos.length > 0) {
        const { error: vErr } = await supabase.from("veiculos").insert(
          veiculosValidos.map(v => ({ transportadora_id: newT.id, placa: v.placa, uf_placa: v.ufPlaca, rntrc: v.rntrc || null }))
        );
        if (vErr) { toast.error("Erro ao salvar veículos."); console.error(vErr); }
      }
      toast.success("Transportadora cadastrada!");
    }

    setSaving(false);
    resetForm();
    fetchData();
  };

  const remove = async (id: string) => {
    // Veículos são deletados em cascata
    const { error } = await supabase.from("transportadoras").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover."); console.error(error); }
    else { toast.success("Removida."); fetchData(); }
  };

  const filtered = lista.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.cpfCnpj.includes(busca) ||
    t.veiculos.some(v => v.placa.includes(busca.toUpperCase()))
  );

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Transportadoras</h2>
          <p className="text-sm text-muted-foreground">Cadastro de transportadores e veículos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Truck className="mr-2 h-4 w-4" /> Nova Transportadora
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6 animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{editingId ? "Editar" : "Nova"} Transportadora</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome / Razão Social</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do transportador" className="mt-1" />
            </div>
            <div>
              <Label>CPF / CNPJ</Label>
              <Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="mt-1" />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">Veículos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addVeiculo}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Veículo
              </Button>
            </div>
            <div className="space-y-4">
              {veiculos.map((v, idx) => (
                <div key={v.id} className="rounded-md border border-border bg-muted/30 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Veículo {idx + 1}</span>
                    {veiculos.length > 1 && (
                      <button onClick={() => removeVeiculo(v.id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Placa</Label>
                      <Input value={v.placa} onChange={e => updateVeiculo(v.id, "placa", e.target.value.toUpperCase())} placeholder="ABC-1D23" maxLength={8} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">UF da Placa</Label>
                      <select value={v.ufPlaca} onChange={e => updateVeiculo(v.id, "ufPlaca", e.target.value)} className={`mt-1 ${selectClasses}`}>
                        <option value="">UF</option>
                        {estadosBR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">RNTRC (opcional)</Label>
                      <Input value={v.rntrc || ""} onChange={e => updateVeiculo(v.id, "rntrc", e.target.value)} placeholder="Nº RNTRC" className="mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, placa ou CPF/CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Veículos</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{t.nome}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.cpfCnpj}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="space-y-1">
                      {t.veiculos.map(v => (
                        <div key={v.id} className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-mono">
                            {v.placa} ({v.ufPlaca})
                          </span>
                          {v.rntrc && <span className="text-xs text-muted-foreground">RNTRC: {v.rntrc}</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => edit(t)} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Editar</button>
                      <button onClick={() => remove(t.id)} className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhuma transportadora encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default Transportadoras;
