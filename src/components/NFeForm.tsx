import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Send, Loader2, Save, UserPlus, Truck } from "lucide-react";
import { toast } from "sonner";
import { NFeItem, TipoNota, tipoNotaConfig } from "@/types/nfe";
import { Veiculo } from "@/types/transportadora";
import { supabase } from "@/integrations/supabase/client";
import { Cliente, InscricaoEstadual } from "@/types/cliente";
import { Mercadoria } from "@/types/mercadoria";
import { Transportadora } from "@/types/transportadora";
import { useEmitente } from "@/contexts/EmitenteContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  checkProxyHealth,
  transmitViLocalProxy,
  parseAutorizacaoResponse,
} from "@/lib/sefazLocalTransmit";

// Nome do leilão será obtido do emitente selecionado

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const selectClasses =
  "flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const inputCompact = "h-8 text-xs px-2";
const labelCompact = "text-[11px] font-medium text-muted-foreground";

const estadosBR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

/* ─── Inline Client Picker ─── */
const ClienteSelect = ({
  label, value, onChange, selected, ieValue, onIEChange, selectedIE, clientes, onAddNew,
}: {
  label: string; value: string; onChange: (v: string) => void;
  selected: Cliente | undefined; ieValue: string; onIEChange: (v: string) => void;
  selectedIE: InscricaoEstadual | undefined; clientes: Cliente[];
  onAddNew?: () => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm) ||
    c.inscricoesEstaduais.some(ie => ie.propriedade.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (clienteId: string) => {
    onChange(clienteId);
    onIEChange("");
    const cl = clientes.find(c => c.id === clienteId);
    setSearchTerm(cl ? `${cl.nome} - ${cl.cpf}` : "");
    setShowDropdown(false);
  };

  const selectedNome = clientes.find(c => c.id === value);
  const displayValue = value && selectedNome && !showDropdown ? `${selectedNome.nome} - ${selectedNome.cpf}` : searchTerm;

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Label className={labelCompact}>{label}</Label>
        <div className="flex gap-1">
          <Input
            value={displayValue}
            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); if (!e.target.value) { onChange(""); onIEChange(""); } }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Nome, CPF ou propriedade..."
            className={inputCompact}
          />
          {onAddNew && (
            <Button type="button" variant="outline" size="sm" onClick={onAddNew} className="h-8 px-2 shrink-0" title="Cadastrar novo cliente">
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {showDropdown && filteredClientes.length > 0 && (
          <div className="absolute z-50 mt-0.5 w-full max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filteredClientes.map((c) => (
              <button key={c.id} type="button" onMouseDown={() => handleSelect(c.id)}
                className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent transition-colors">
                <span className="font-medium">{c.nome}</span>
                <span className="ml-1 text-muted-foreground">{c.cpf}</span>
                {c.inscricoesEstaduais.length > 0 && (
                  <span className="ml-1 text-muted-foreground">— {c.inscricoesEstaduais.map(ie => ie.propriedade).join(", ")}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <>
          <div className="min-w-[180px]">
            <Label className={labelCompact}>Inscrição Estadual</Label>
            <select value={ieValue} onChange={(e) => onIEChange(e.target.value)} className={selectClasses}>
              <option value="">Selecionar IE...</option>
              {selected.inscricoesEstaduais.map((ie) => (
                <option key={ie.id} value={ie.numero}>{ie.numero} ({ie.uf}) — {ie.propriedade}</option>
              ))}
            </select>
          </div>
          {selectedIE && (
            <>
              <div><Label className={labelCompact}>Propriedade</Label><Input value={selectedIE.propriedade} readOnly className={`${inputCompact} bg-muted w-[140px]`} /></div>
              <div><Label className={labelCompact}>Cidade</Label><Input value={selectedIE.cidade} readOnly className={`${inputCompact} bg-muted w-[120px]`} /></div>
              <div><Label className={labelCompact}>UF</Label><Input value={selectedIE.estado} readOnly className={`${inputCompact} bg-muted w-[50px]`} /></div>
              <div><Label className={labelCompact}>CEP</Label><Input value={selectedIE.cep} readOnly className={`${inputCompact} bg-muted w-[90px]`} /></div>
            </>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Transportador Select (searchable) ─── */
const TransportadoraSelect = ({
  value, onChange, transportadoras, selected, veiculoId, onVeiculoChange, onAddNew,
}: {
  value: string; onChange: (v: string) => void;
  transportadoras: Transportadora[]; selected: Transportadora | undefined;
  veiculoId: string; onVeiculoChange: (v: string) => void;
  onAddNew?: () => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = transportadoras.filter((t) =>
    t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cpfCnpj.includes(searchTerm) ||
    t.veiculos.some(v => v.placa.includes(searchTerm.toUpperCase()))
  );

  const handleSelect = (id: string) => {
    onChange(id);
    onVeiculoChange("");
    const t = transportadoras.find(tr => tr.id === id);
    setSearchTerm(t ? `${t.nome} — ${t.cpfCnpj}` : "");
    setShowDropdown(false);
  };

  const selectedT = transportadoras.find(t => t.id === value);
  const displayValue = value && selectedT && !showDropdown ? `${selectedT.nome} — ${selectedT.cpfCnpj}` : searchTerm;
  const selectedVeiculo = selected?.veiculos.find(v => v.id === veiculoId);

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Label className={labelCompact}>Transportadora</Label>
        <div className="flex gap-1">
          <Input
            value={displayValue}
            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); if (!e.target.value) { onChange(""); onVeiculoChange(""); } }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Nome, placa ou CPF/CNPJ..."
            className={inputCompact}
          />
          {onAddNew && (
            <Button type="button" variant="outline" size="sm" onClick={onAddNew} className="h-8 px-2 shrink-0" title="Cadastrar nova transportadora">
              <Truck className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-50 mt-0.5 w-full max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filtered.map((t) => (
              <button key={t.id} type="button" onMouseDown={() => handleSelect(t.id)}
                className="w-full px-2 py-1.5 text-left text-xs hover:bg-accent transition-colors">
                <span className="font-medium">{t.nome}</span>
                <span className="ml-1 text-muted-foreground">({t.cpfCnpj})</span>
                {t.veiculos.length > 0 && <span className="ml-1 text-muted-foreground">— {t.veiculos.map(v => v.placa).join(", ")}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && selected.veiculos.length > 0 && (
        <>
          <div className="min-w-[180px]">
            <Label className={labelCompact}>Veículo</Label>
            <select value={veiculoId} onChange={(e) => onVeiculoChange(e.target.value)} className={selectClasses}>
              <option value="">Selecionar veículo...</option>
              {selected.veiculos.map((v) => (
                <option key={v.id} value={v.id}>{v.placa} ({v.ufPlaca}){v.rntrc ? ` — RNTRC: ${v.rntrc}` : ""}</option>
              ))}
            </select>
          </div>
          {selectedVeiculo && (
            <>
              <div><Label className={labelCompact}>Placa</Label><Input value={selectedVeiculo.placa} readOnly className={`${inputCompact} bg-muted w-[100px]`} /></div>
              <div><Label className={labelCompact}>UF</Label><Input value={selectedVeiculo.ufPlaca} readOnly className={`${inputCompact} bg-muted w-[50px]`} /></div>
            </>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Inline Add Client Dialog ─── */
const AddClienteDialog = ({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (cliente: Cliente) => void }) => {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [ieNumero, setIeNumero] = useState("");
  const [ieUf, setIeUf] = useState("");
  const [ieProp, setIeProp] = useState("");
  const [ieCidade, setIeCidade] = useState("");
  const [ieEstado, setIeEstado] = useState("");
  const [ieCep, setIeCep] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim() || !cpf.trim()) { toast.error("Nome e CPF são obrigatórios."); return; }
    setSaving(true);
    const { data: clienteData, error } = await supabase.from("clientes").insert({ nome, cpf }).select("id").single();
    if (error || !clienteData) { toast.error("Erro ao cadastrar cliente."); setSaving(false); return; }

    const ies: InscricaoEstadual[] = [];
    if (ieNumero.trim()) {
      const { data: ieData, error: ieErr } = await supabase.from("inscricoes_estaduais").insert({
        cliente_id: clienteData.id, numero: ieNumero, uf: ieUf || ieEstado, propriedade: ieProp, cidade: ieCidade, estado: ieEstado, cep: ieCep || null,
      }).select("*").single();
      if (!ieErr && ieData) {
        ies.push({ id: ieData.id, numero: ieData.numero, uf: ieData.uf, propriedade: ieData.propriedade, cidade: ieData.cidade, estado: ieData.estado, cep: ieData.cep || "" });
      }
    }

    const newCliente: Cliente = { id: clienteData.id, nome, cpf, inscricoesEstaduais: ies };
    onCreated(newCliente);
    toast.success("Cliente cadastrado!");
    setNome(""); setCpf(""); setIeNumero(""); setIeUf(""); setIeProp(""); setIeCidade(""); setIeEstado(""); setIeCep("");
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar Novo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value.toUpperCase())} placeholder="Nome completo" className="mt-1" /></div>
            <div><Label>CPF</Label><Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" className="mt-1" /></div>
          </div>
          <h4 className="text-sm font-semibold text-muted-foreground pt-2">Inscrição Estadual (opcional)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nº IE</Label><Input value={ieNumero} onChange={e => setIeNumero(e.target.value)} placeholder="123.456.789" className="mt-1" /></div>
            <div><Label>UF</Label>
              <select value={ieUf} onChange={e => { setIeUf(e.target.value); setIeEstado(e.target.value); }} className={`mt-1 ${selectClasses} h-10`}>
                <option value="">UF</option>
                {estadosBR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div><Label>Propriedade</Label><Input value={ieProp} onChange={e => setIeProp(e.target.value.toUpperCase())} placeholder="Fazenda..." className="mt-1" /></div>
            <div><Label>Cidade</Label><Input value={ieCidade} onChange={e => setIeCidade(e.target.value.toUpperCase())} placeholder="Cidade" className="mt-1" /></div>
            <div><Label>CEP</Label><Input value={ieCep} onChange={e => setIeCep(e.target.value)} placeholder="00000-000" className="mt-1" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Inline Add Transportadora Dialog ─── */
const AddTransportadoraDialog = ({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (t: Transportadora) => void }) => {
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [placa, setPlaca] = useState("");
  const [ufPlaca, setUfPlaca] = useState("");
  const [rntrc, setRntrc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim() || !placa.trim()) { toast.error("Nome e placa são obrigatórios."); return; }
    setSaving(true);
    const { data, error } = await supabase.from("transportadoras").insert({ nome, cpf_cnpj: cpfCnpj }).select("id").single();
    if (error || !data) { toast.error("Erro ao cadastrar."); setSaving(false); return; }
    
    const { data: veicData, error: vErr } = await supabase.from("veiculos").insert({ transportadora_id: data.id, placa, uf_placa: ufPlaca, rntrc: rntrc || null }).select("id").single();
    const veiculos: Veiculo[] = veicData ? [{ id: veicData.id, placa, ufPlaca, rntrc: rntrc || undefined }] : [];
    if (vErr) console.error(vErr);

    const newT: Transportadora = { id: data.id, nome, cpfCnpj, veiculos };
    onCreated(newT);
    toast.success("Transportadora cadastrada!");
    setNome(""); setCpfCnpj(""); setPlaca(""); setUfPlaca(""); setRntrc("");
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Cadastrar Nova Transportadora</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome / Razão Social</Label><Input value={nome} onChange={e => setNome(e.target.value.toUpperCase())} placeholder="Nome do transportador" className="mt-1" /></div>
          <div><Label>CPF / CNPJ</Label><Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Placa</Label><Input value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-1D23" maxLength={8} className="mt-1" /></div>
            <div><Label>UF da Placa</Label>
              <select value={ufPlaca} onChange={e => setUfPlaca(e.target.value)} className={`mt-1 ${selectClasses} h-10`}>
                <option value="">UF</option>
                {estadosBR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div><Label>RNTRC (opcional)</Label><Input value={rntrc} onChange={e => setRntrc(e.target.value)} placeholder="Nº RNTRC" className="mt-1" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Valor Input ─── */
const ValorInput = ({ value, onChange, className = "" }: { value: number; onChange: (v: number) => void; className?: string }) => {
  const [text, setText] = useState(value ? String(value).replace(".", ",") : "");
  const lastValueRef = useState({ v: value })[0];
  if (value !== lastValueRef.v && !text.endsWith(",")) {
    lastValueRef.v = value;
  }
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9,]/g, "");
        setText(raw);
        const parsed = parseFloat(raw.replace(",", "."));
        onChange(isNaN(parsed) ? 0 : parsed);
        lastValueRef.v = isNaN(parsed) ? 0 : parsed;
      }}
      onBlur={() => setText(value ? String(value).replace(".", ",") : "")}
      placeholder="0,00"
      className={`${inputCompact} ${className}`}
    />
  );
};

/* ═══════════════════════ MAIN FORM ═══════════════════════ */
const NFeForm = () => {
  const { emitenteAtivo, refetch: refetchEmitente } = useEmitente();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const [tipoNota, setTipoNota] = useState<TipoNota>("simples_remessa");
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certSenha, setCertSenha] = useState(emitenteAtivo?.cert_senha || "");
  const [editNumero, setEditNumero] = useState<string | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mercadorias, setMercadorias] = useState<Mercadoria[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);

  const [remetenteRealId, setRemetenteRealId] = useState("");
  const [remetenteRealIE, setRemetenteRealIE] = useState("");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [destinatarioIE, setDestinatarioIE] = useState("");
  const [transportadoraId, setTransportadoraId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [notaEntradaNumero, setNotaEntradaNumero] = useState("");
  const [chaveAcessoEntrada, setChaveAcessoEntrada] = useState("");
  const [gtaSaida, setGtaSaida] = useState("");
  const [gtaSerie, setGtaSerie] = useState("");
  const [itens, setItens] = useState<NFeItem[]>([
    { id: "1", descricao: "", ncm: "0102.29.90", quantidade: 1, valorUnitario: 0, valorTotal: 0, lote: "", raca: "", peso: 0, codigoSefaz: "" },
  ]);
  const [observacoesExtra, setObservacoesExtra] = useState("");

  // Inline dialogs state
  const [showAddCliente, setShowAddCliente] = useState(false);
  const [showAddTransportadora, setShowAddTransportadora] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      const [clientesRes, iesRes, mercRes, transRes, veicRes] = await Promise.all([
        supabase.from("clientes").select("*").order("nome"),
        supabase.from("inscricoes_estaduais").select("*"),
        supabase.from("mercadorias").select("*").order("codigo"),
        supabase.from("transportadoras").select("*").order("nome"),
        supabase.from("veiculos").select("*"),
      ]);

      const iesData = iesRes.data || [];
      const clientesList: Cliente[] = (clientesRes.data || []).map((c) => ({
        id: c.id, nome: c.nome, cpf: c.cpf,
        inscricoesEstaduais: iesData
          .filter((ie) => ie.cliente_id === c.id)
          .map((ie) => ({ id: ie.id, numero: ie.numero, uf: ie.uf, propriedade: ie.propriedade, cidade: ie.cidade, estado: ie.estado, cep: ie.cep || "" })),
      }));
      setClientes(clientesList);
      const mercList = (mercRes.data || []).map((m) => ({ id: m.id, codigo: m.codigo, descricao: m.descricao, ncm: m.ncm, unidade: m.unidade, especie: m.especie as "bovino" | "equino", categoria: m.categoria, valorPauta: Number(m.valor_pauta) }));
      setMercadorias(mercList);
      const veiculosData = veicRes.data || [];
      setTransportadoras((transRes.data || []).map((t) => ({
        id: t.id, nome: t.nome, cpfCnpj: t.cpf_cnpj,
        veiculos: veiculosData.filter(v => v.transportadora_id === t.id).map(v => ({ id: v.id, placa: v.placa, ufPlaca: v.uf_placa, rntrc: v.rntrc || undefined })),
      })));

      // Load existing note if editing
      if (editId) {
        const { data: nota } = await supabase.from("notas_fiscais").select("*").eq("id", editId).single();
        if (nota && nota.status === "rascunho") {
          setTipoNota(nota.tipo_nota as TipoNota);
          setEditNumero(nota.numero);
          setObservacoesExtra(nota.observacoes || "");

          const matchClient = (cpf: string) => clientesList.find(c => c.cpf === cpf);

          if (nota.tipo_nota === "nota_entrada") {
            const rem = matchClient(nota.emitente_cpf_cnpj);
            if (rem) { setRemetenteRealId(rem.id); setRemetenteRealIE(nota.emitente_ie || ""); }
          } else {
            const dest = matchClient(nota.destinatario_cpf_cnpj);
            if (dest) { setDestinatarioId(dest.id); setDestinatarioIE(nota.destinatario_ie || ""); }
            if (nota.tipo_nota === "simples_remessa") {
              // remetente real is in obs
            }
          }

          const trans = (transRes.data || []).find(t => t.nome === nota.transportador_nome);
          if (trans) setTransportadoraId(trans.id);

          const { data: itensDb } = await supabase.from("nfe_itens").select("*").eq("nota_fiscal_id", editId);
          if (itensDb && itensDb.length > 0) {
            setItens(itensDb.map(i => ({
              id: i.id,
              codigoSefaz: i.codigo_sefaz || "",
              descricao: i.descricao,
              ncm: i.ncm,
              quantidade: i.quantidade,
              valorUnitario: Number(i.valor_unitario),
              valorTotal: Number(i.valor_total),
              lote: i.lote || "",
              raca: i.raca || "",
              peso: i.peso ? Number(i.peso) : 0,
            })));
          }
        } else {
          toast.error("Nota não encontrada ou não é rascunho.");
          navigate("/notas");
        }
      }

      setLoadingData(false);
    };
    fetchData();
  }, [editId]);

  const remetenteReal = clientes.find((c) => c.id === remetenteRealId);
  const destinatario = clientes.find((c) => c.id === destinatarioId);
  const remetenteRealIEObj = remetenteReal?.inscricoesEstaduais.find((ie) => ie.numero === remetenteRealIE);
  const destinatarioIEObj = destinatario?.inscricoesEstaduais.find((ie) => ie.numero === destinatarioIE);
  const transportadora = transportadoras.find((t) => t.id === transportadoraId);
  const veiculoSelecionado = transportadora?.veiculos.find(v => v.id === veiculoId);

  const isEntrada = tipoNota === "nota_entrada";
  const isRetorno = tipoNota === "retorno_origem";
  const isRemessa = tipoNota === "simples_remessa";

  const infoAdicionais = useMemo(() => {
    const partes: string[] = [];
    if (isEntrada && remetenteReal) partes.push(`Gado remetido para o ${emitenteAtivo?.razao_social || "Leilão"}.`);
    if (isRetorno) {
      if (notaEntradaNumero.trim()) partes.push(`Referente à Nota de Entrada nº ${notaEntradaNumero}.`);
      if (chaveAcessoEntrada.trim()) partes.push(`Chave de Acesso da NF-e de Entrada: ${chaveAcessoEntrada}.`);
    }
    if (isRemessa && remetenteReal && remetenteRealIEObj) {
      const ieTexto = remetenteRealIE ? `, IE: ${remetenteRealIE}` : "";
      partes.push(`Remetente Real: ${remetenteReal.nome}, CPF/CNPJ: ${remetenteReal.cpf}${ieTexto}, Propriedade: ${remetenteRealIEObj.propriedade}, ${remetenteRealIEObj.cidade}/${remetenteRealIEObj.estado}`);
      if (notaEntradaNumero.trim()) partes.push(`Referente à Nota de Entrada nº ${notaEntradaNumero}.`);
      partes.push(`Mercadoria remetida por conta e ordem de terceiros conforme Art. 12 do Anexo XII do RCTE-GO.`);
    }
    if (gtaSaida.trim()) partes.push(`GTA de Saída nº ${gtaSaida}${gtaSerie.trim() ? `, Série: ${gtaSerie}` : ""}.`);
    if (observacoesExtra.trim()) partes.push(observacoesExtra.trim());
    const lotes = itens.filter(i => i.lote?.trim()).map(i => i.lote);
    if (lotes.length > 0) partes.push(`Lote(s): ${lotes.join("; ")}`);
    return partes.join("\n");
  }, [emitenteAtivo, remetenteReal, remetenteRealIE, remetenteRealIEObj, destinatario, destinatarioIE, destinatarioIEObj, tipoNota, isEntrada, isRetorno, isRemessa, observacoesExtra, notaEntradaNumero, chaveAcessoEntrada, gtaSaida, gtaSerie, itens]);

  const addItem = () => {
    setItens([...itens, { id: String(Date.now()), descricao: "", ncm: "0102.29.90", quantidade: 1, valorUnitario: 0, valorTotal: 0, lote: "", raca: "", peso: 0, codigoSefaz: "" }]);
  };
  const removeItem = (id: string) => { if (itens.length <= 1) return; setItens(itens.filter((i) => i.id !== id)); };
  const updateItem = (id: string, field: keyof NFeItem, value: string | number) => {
    setItens(itens.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantidade" || field === "valorUnitario") updated.valorTotal = updated.quantidade * updated.valorUnitario;
      return updated;
    }));
  };
  const handleCodigoSefaz = (itemId: string, rawCodigo: string) => {
    const codigo = rawCodigo.replace(/^0+/, '') || rawCodigo;
    const mercadoria = mercadorias.find((m) => m.codigo.replace(/^0+/, '') === codigo || m.codigo === rawCodigo);
    setItens(itens.map((item) => {
      if (item.id !== itemId) return item;
      if (mercadoria) return { ...item, codigoSefaz: codigo, descricao: mercadoria.descricao, ncm: mercadoria.ncm, valorUnitario: mercadoria.valorPauta, valorTotal: item.quantidade * mercadoria.valorPauta };
      return { ...item, codigoSefaz: codigo };
    }));
  };

  const valorTotal = itens.reduce((sum, i) => sum + i.valorTotal, 0);

  // Callback when new client is created inline
  const handleClienteCreated = (newCliente: Cliente) => {
    setClientes(prev => [...prev, newCliente].sort((a, b) => a.nome.localeCompare(b.nome)));
  };

  // Callback when new transportadora is created inline
  const handleTransportadoraCreated = (newT: Transportadora) => {
    setTransportadoras(prev => [...prev, newT].sort((a, b) => a.nome.localeCompare(b.nome)));
    setTransportadoraId(newT.id);
  };

  /* ─── Save Logic ─── */
  const saveNota = async (status: "rascunho" | "emitida") => {
    if (!emitenteAtivo) { toast.error("Nenhum emitente ativo configurado."); return; }
    if (isRemessa && !remetenteRealId) { toast.error("Selecione o remetente real (vendedor)."); return; }
    if (isRemessa && !destinatarioId) { toast.error("Selecione o destinatário."); return; }
    if (isEntrada && !remetenteRealId) { toast.error("Selecione o remetente (cliente)."); return; }
    if (isRetorno && !destinatarioId) { toast.error("Selecione o destinatário."); return; }
    if (itens.some(i => !i.descricao.trim())) { toast.error("Preencha a descrição de todos os itens."); return; }

    setSaving(true);
    try {
      let emitenteData = {
        emitente_razao_social: emitenteAtivo.razao_social, emitente_cpf_cnpj: emitenteAtivo.cpf_cnpj,
        emitente_ie: emitenteAtivo.inscricao_estadual || "", emitente_propriedade: "",
        emitente_endereco: emitenteAtivo.endereco || "", emitente_cidade: emitenteAtivo.cidade || "",
        emitente_uf: emitenteAtivo.uf || "", emitente_cep: emitenteAtivo.cep || "",
      };
      let destData = {
        destinatario_razao_social: "", destinatario_cpf_cnpj: "", destinatario_ie: "",
        destinatario_propriedade: "", destinatario_endereco: "", destinatario_cidade: "",
        destinatario_uf: "", destinatario_cep: "",
      };

      if (isEntrada && remetenteReal) {
        // Entrada: emitente = Rafael Leilões (quem emite), destinatário = cliente remetente
        destData = {
          destinatario_razao_social: remetenteReal.nome, destinatario_cpf_cnpj: remetenteReal.cpf,
          destinatario_ie: remetenteRealIE || "", destinatario_propriedade: remetenteRealIEObj?.propriedade || "",
          destinatario_endereco: "", destinatario_cidade: remetenteRealIEObj?.cidade || "",
          destinatario_uf: remetenteRealIEObj?.uf || "", destinatario_cep: remetenteRealIEObj?.cep || "",
        };
      } else if ((isRemessa || isRetorno) && destinatario) {
        destData = {
          destinatario_razao_social: destinatario.nome, destinatario_cpf_cnpj: destinatario.cpf,
          destinatario_ie: destinatarioIE || "", destinatario_propriedade: destinatarioIEObj?.propriedade || "",
          destinatario_endereco: "", destinatario_cidade: destinatarioIEObj?.cidade || "",
          destinatario_uf: destinatarioIEObj?.uf || "", destinatario_cep: destinatarioIEObj?.cep || "",
        };
      }

      const numero = editId ? editNumero! : String(emitenteAtivo.numero_nota_atual);
      const transportadorData = transportadora ? {
        transportador_nome: transportadora.nome, transportador_cpf_cnpj: transportadora.cpfCnpj || null,
        transportador_placa: veiculoSelecionado?.placa || null, transportador_uf: veiculoSelecionado?.ufPlaca || null,
        transportador_rntrc: veiculoSelecionado?.rntrc || null,
      } : { transportador_nome: null, transportador_cpf_cnpj: null, transportador_placa: null, transportador_uf: null, transportador_rntrc: null };

      const initialStatus = status === "emitida" ? "rascunho" : status;
      const notaPayload = {
        numero, serie: emitenteAtivo.serie, tipo_nota: tipoNota,
        natureza_operacao: tipoNotaConfig[tipoNota].label, status: initialStatus,
        valor_total: valorTotal, observacoes: infoAdicionais,
        ...emitenteData, ...destData, ...transportadorData,
      };

      let notaId: string;

      if (editId) {
        const { error: updateErr } = await supabase.from("notas_fiscais").update(notaPayload).eq("id", editId);
        if (updateErr) { toast.error("Erro ao atualizar nota fiscal."); setSaving(false); return; }
        notaId = editId;
        await supabase.from("nfe_itens").delete().eq("nota_fiscal_id", editId);
      } else {
        const { data: notaData, error: notaErr } = await supabase.from("notas_fiscais").insert(notaPayload).select("id").single();
        if (notaErr || !notaData) { toast.error("Erro ao salvar nota fiscal."); setSaving(false); return; }
        notaId = notaData.id;
        await supabase.from("emitentes").update({ numero_nota_atual: emitenteAtivo.numero_nota_atual + 1 }).eq("id", emitenteAtivo.id);
      }

      const itensInsert = itens.map(i => ({
        nota_fiscal_id: notaId, codigo_sefaz: i.codigoSefaz ? i.codigoSefaz.replace(/^0+/, '') || i.codigoSefaz : null,
        descricao: i.descricao, ncm: i.ncm, quantidade: i.quantidade,
        valor_unitario: i.valorUnitario, valor_total: i.valorTotal,
        lote: i.lote || null, raca: i.raca || null, peso: i.peso || null,
      }));
      await supabase.from("nfe_itens").insert(itensInsert);
      if (!editId) await refetchEmitente();

      if (status === "emitida" && certSenha && emitenteAtivo.cert_file_path) {
        const proxyOk = await checkProxyHealth();
        if (!proxyOk) { toast.error("Proxy SEFAZ offline! Verifique a VPS."); setSaving(false); return; }
        toast.info("Preparando NF-e para transmissão...");
        try {
          const cfopMap: Record<string, string> = { simples_remessa: "5923", retorno_origem: "5918", nota_entrada: "1914" };
          const { data: prepareResult, error: fnError } = await supabase.functions.invoke("sefaz-nfe", {
            body: {
              prepare_only: true, emitente_id: emitenteAtivo.id, cert_senha: certSenha, ambiente: "1",
              nota_fiscal_id: notaId, numero, serie: emitenteAtivo.serie,
              data_emissao: new Date().toISOString().split("T")[0],
              natureza_operacao: tipoNotaConfig[tipoNota].label, tipo_nota: tipoNota,
              cfop: cfopMap[tipoNota] || "5923", emitente_data: emitenteData, destinatario_data: destData,
              itens: itens.map(i => ({ codigoSefaz: i.codigoSefaz, descricao: i.descricao, ncm: i.ncm, quantidade: i.quantidade, valorUnitario: i.valorUnitario, valorTotal: i.valorTotal })),
              valor_total: valorTotal, informacoes_adicionais: infoAdicionais,
              chave_nfe_referenciada: isRetorno ? chaveAcessoEntrada.replace(/\D/g, "") : null,
              transportador_data: transportadora ? { nome: transportadora.nome, cpfCnpj: transportadora.cpfCnpj || null, placa: veiculoSelecionado?.placa || null, uf: veiculoSelecionado?.ufPlaca || null, rntrc: veiculoSelecionado?.rntrc || null } : null,
            },
          });
          if (fnError || !prepareResult?.success) { toast.error("Erro ao preparar XML: " + (fnError?.message || prepareResult?.error)); setSaving(false); return; }
          toast.info("Transmitindo NF-e para a SEFAZ...");
          const proxyResult = await transmitViLocalProxy({ sefaz_url: prepareResult.sefaz_url, soap_xml: prepareResult.soap_xml, cert_pem: prepareResult.cert_pem, key_pem: prepareResult.key_pem });
          const sefazResponse = parseAutorizacaoResponse(proxyResult.responseXml);
          if (["100", "104"].includes(sefazResponse.cStat) && sefazResponse.nProt) {
            await supabase.from("notas_fiscais").update({ chave_acesso: prepareResult.chave_acesso, protocolo_autorizacao: sefazResponse.nProt, status: "emitida" }).eq("id", notaId);
            toast.success(`NF-e autorizada! Protocolo: ${sefazResponse.nProt}`);
          } else {
            toast.warning(`SEFAZ rejeitou: ${sefazResponse.xMotivo} (cStat: ${sefazResponse.cStat})`);
            console.error("SEFAZ response XML:", proxyResult.responseXml);
          }
        } catch (err: any) {
          toast.warning("Nota salva, mas erro ao transmitir: " + err.message);
        }
      } else if (status === "emitida") {
        toast.success(`NF-e nº ${numero} salva (informe a senha do certificado para transmitir).`);
      } else {
        toast.success(`NF-e nº ${numero} salva como rascunho!`);
      }
      navigate("/notas");
    } catch (err: any) {
      toast.error("Erro inesperado ao salvar nota fiscal.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando dados...</span>
      </div>
    );
  }

  return (
    /* Use div instead of form to prevent Enter key from triggering submit */
    <div className="flex flex-col h-[calc(100vh-60px)] lg:h-[calc(100vh-32px)] overflow-hidden"
      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
    >
      {/* ── TOP BAR: Operação + Ações ── */}
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Operação</span>
          <select
            value={tipoNota}
            onChange={(e) => setTipoNota(e.target.value as TipoNota)}
            className="h-8 rounded-md border border-primary bg-primary/10 px-3 text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {(Object.keys(tipoNotaConfig) as TipoNota[]).map((tipo) => (
              <option key={tipo} value={tipo}>{tipoNotaConfig[tipo].label.toUpperCase()} — CFOP {tipoNotaConfig[tipo].cfop}</option>
            ))}
          </select>
          {emitenteAtivo && (
            <span className="text-xs text-muted-foreground ml-4">
              {editId ? (
                <>Editando Nº <strong className="text-foreground">{editNumero}</strong> · Série {emitenteAtivo.serie}</>
              ) : (
                <>Nº <strong className="text-foreground">{emitenteAtivo.numero_nota_atual}</strong> · Série {emitenteAtivo.serie}</>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => saveNota("rascunho")} className="h-8 text-xs">
            {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            <Save className="mr-1 h-3.5 w-3.5" />Gravar
          </Button>
          <Button type="button" size="sm" disabled={saving || !certSenha} onClick={() => saveNota("emitida")} className="h-8 text-xs" title={!certSenha ? "Configure a senha do certificado em Configurações" : ""}>
            {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            <Send className="mr-1 h-3.5 w-3.5" />Emitir
          </Button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {/* Row 1: Destinatário + Remetente/Procedência side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Left: Destinatário */}
          <div className="rounded border border-border bg-card p-2.5">
            <h4 className="text-[11px] font-bold text-primary uppercase mb-1.5">
              {isEntrada ? "Remetente (Cliente)" : "Destinatário"}
            </h4>
            {isEntrada ? (
              <ClienteSelect label="Cliente Remetente" value={remetenteRealId} onChange={setRemetenteRealId} selected={remetenteReal} ieValue={remetenteRealIE} onIEChange={setRemetenteRealIE} selectedIE={remetenteRealIEObj} clientes={clientes} onAddNew={() => setShowAddCliente(true)} />
            ) : (isRetorno || isRemessa) ? (
              <ClienteSelect label="Cliente Destinatário" value={destinatarioId} onChange={setDestinatarioId} selected={destinatario} ieValue={destinatarioIE} onIEChange={setDestinatarioIE} selectedIE={destinatarioIEObj} clientes={clientes} onAddNew={() => setShowAddCliente(true)} />
            ) : null}
          </div>

          {/* Right: Procedência / Remetente Real */}
          <div className="rounded border border-border bg-card p-2.5">
            <h4 className="text-[11px] font-bold text-primary uppercase mb-1.5">
              {isRemessa ? "Procedência (Remetente Real)" : isEntrada ? "Destinatário (Leilão)" : "Remetente (Leilão)"}
            </h4>
            {isRemessa ? (
              <ClienteSelect label="Vendedor (Remetente Real)" value={remetenteRealId} onChange={setRemetenteRealId} selected={remetenteReal} ieValue={remetenteRealIE} onIEChange={setRemetenteRealIE} selectedIE={remetenteRealIEObj} clientes={clientes} onAddNew={() => setShowAddCliente(true)} />
            ) : (
              <p className="text-xs text-muted-foreground">
                {emitenteAtivo ? `${emitenteAtivo.razao_social} — ${emitenteAtivo.cpf_cnpj}` : "Configure o emitente"}
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Product input + Item table */}
        <div className="rounded border border-border bg-card p-2.5 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[11px] font-bold text-primary uppercase">Itens (Gado)</h4>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-[11px] px-2">
              <Plus className="mr-1 h-3 w-3" />Incluir
            </Button>
          </div>

          {/* Items as compact table */}
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-2 py-1.5 text-left font-medium w-[40px]">Seq</th>
                  <th className="px-2 py-1.5 text-left font-medium w-[80px]">Código</th>
                  <th className="px-2 py-1.5 text-left font-medium">Descrição</th>
                  <th className="px-2 py-1.5 text-left font-medium w-[80px]">Raça</th>
                  <th className="px-2 py-1.5 text-right font-medium w-[70px]">Quant</th>
                  <th className="px-2 py-1.5 text-right font-medium w-[90px]">Vlr. Unit.</th>
                  <th className="px-2 py-1.5 text-right font-medium w-[90px]">Vlr. Total</th>
                  <th className="px-2 py-1.5 text-left font-medium w-[70px]">Lote</th>
                  <th className="px-2 py-1.5 w-[32px]"></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, idx) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-2 py-1 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-1 py-1">
                      <Input value={item.codigoSefaz || ""} onChange={(e) => handleCodigoSefaz(item.id, e.target.value)} placeholder="Cód" className="h-7 text-xs px-1.5 w-full" inputMode="numeric" list={`m-${item.id}`} />
                      <datalist id={`m-${item.id}`}>{mercadorias.map((m) => (<option key={m.id} value={m.codigo.replace(/^0+/, '') || m.codigo}>{m.codigo.replace(/^0+/, '')} - {m.descricao}</option>))}</datalist>
                    </td>
                    <td className="px-1 py-1">
                      <Input value={item.descricao} onChange={(e) => updateItem(item.id, "descricao", e.target.value.toUpperCase())} placeholder="Descrição" className="h-7 text-xs px-1.5 w-full" />
                    </td>
                    <td className="px-1 py-1">
                      <Input value={item.raca || ""} onChange={(e) => updateItem(item.id, "raca", e.target.value.toUpperCase())} placeholder="Raça" className="h-7 text-xs px-1.5 w-full" />
                    </td>
                    <td className="px-1 py-1">
                      <Input type="number" inputMode="numeric" min={1} value={item.quantidade} onChange={(e) => updateItem(item.id, "quantidade", Number(e.target.value))} className="h-7 text-xs px-1.5 w-full text-right" />
                    </td>
                    <td className="px-1 py-1">
                      <ValorInput value={item.valorUnitario} onChange={(v) => updateItem(item.id, "valorUnitario", v)} className="h-7 w-full text-right" />
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-foreground">{formatCurrency(item.valorTotal)}</td>
                    <td className="px-1 py-1">
                      <Input value={item.lote} onChange={(e) => updateItem(item.id, "lote", e.target.value.toUpperCase())} placeholder="Lote" className="h-7 text-xs px-1.5 w-full" />
                    </td>
                    <td className="px-1 py-1">
                      {itens.length > 1 && (
                        <button type="button" onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80 p-0.5">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 3: Bottom panels - GTA, Transportador, Observações, Total */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 shrink-0">
          {/* GTA / Referências */}
          <div className="rounded border border-border bg-card p-2.5">
            <h4 className="text-[11px] font-bold text-primary uppercase mb-1.5">Referências / GTA</h4>
            <div className="space-y-1.5">
              <div><Label className={labelCompact}>Nº Nota Entrada</Label><Input value={notaEntradaNumero} onChange={(e) => setNotaEntradaNumero(e.target.value)} placeholder="001234" inputMode="numeric" className={inputCompact} /></div>
              <div className="grid grid-cols-2 gap-1.5">
                <div><Label className={labelCompact}>Nº GTA</Label><Input value={gtaSaida} onChange={(e) => setGtaSaida(e.target.value)} placeholder="123456" inputMode="numeric" className={inputCompact} /></div>
                <div><Label className={labelCompact}>Série GTA</Label><Input value={gtaSerie} onChange={(e) => setGtaSerie(e.target.value.toUpperCase())} placeholder="A" className={inputCompact} /></div>
              </div>
              {isRetorno && (
                <div><Label className={labelCompact}>Chave NF-e Entrada</Label><Input value={chaveAcessoEntrada} onChange={(e) => setChaveAcessoEntrada(e.target.value)} placeholder="44 dígitos" inputMode="numeric" maxLength={44} className={`${inputCompact} font-mono`} /></div>
              )}
            </div>
          </div>

          {/* Transportador */}
          <div className="rounded border border-border bg-card p-2.5">
            <h4 className="text-[11px] font-bold text-primary uppercase mb-1.5">Transportador</h4>
            <div className="space-y-1.5">
              <TransportadoraSelect
                value={transportadoraId}
                onChange={(v) => { setTransportadoraId(v); setVeiculoId(""); }}
                transportadoras={transportadoras}
                selected={transportadora}
                veiculoId={veiculoId}
                onVeiculoChange={setVeiculoId}
                onAddNew={() => setShowAddTransportadora(true)}
              />
            </div>
          </div>

          {/* Observação */}
          <div className="rounded border border-border bg-card p-2.5">
            <h4 className="text-[11px] font-bold text-primary uppercase mb-1.5">Observação</h4>
            <Textarea
              placeholder="Observações extras..."
              rows={3}
              value={observacoesExtra}
              onChange={(e) => setObservacoesExtra(e.target.value.toUpperCase())}
              className="text-xs resize-none"
            />
          </div>

          {/* Total */}
          <div className="rounded border border-primary/30 bg-primary/5 p-2.5 flex flex-col justify-between">
            <h4 className="text-[11px] font-bold text-primary uppercase mb-1.5">Total da Nota</h4>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(valorTotal)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {itens.length} item(ns) · {itens.reduce((s, i) => s + i.quantidade, 0)} cabeça(s)
            </p>
          </div>
        </div>
      </div>

      {/* Inline Dialogs */}
      <AddClienteDialog open={showAddCliente} onClose={() => setShowAddCliente(false)} onCreated={handleClienteCreated} />
      <AddTransportadoraDialog open={showAddTransportadora} onClose={() => setShowAddTransportadora(false)} onCreated={handleTransportadoraCreated} />
    </div>
  );
};

export default NFeForm;
