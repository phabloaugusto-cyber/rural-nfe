import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmitente } from "@/contexts/EmitenteContext";
import { toast } from "sonner";
import {
  checkProxyHealth,
  transmitViLocalProxy,
  parseEventoResponse,
} from "@/lib/sefazLocalTransmit";

interface Inutilizacao {
  id: string;
  serie: string;
  numero_inicial: number;
  numero_final: number;
  justificativa: string;
  protocolo: string | null;
  ano: number;
  status: string;
  created_at: string;
}

const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const Inutilizacoes = () => {
  const { emitenteAtivo } = useEmitente();
  const [lista, setLista] = useState<Inutilizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [serie, setSerie] = useState("1");
  const [numeroInicial, setNumeroInicial] = useState("");
  const [numeroFinal, setNumeroFinal] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [certSenha, setCertSenha] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inutilizacoes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error("Erro ao carregar inutilizações."); console.error(error); }
    else setLista(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setSerie("1");
    setNumeroInicial("");
    setNumeroFinal("");
    setJustificativa("");
    setAno(String(new Date().getFullYear()));
    setCertSenha("");
    setShowForm(false);
  };

  const handleSave = async () => {
    const ni = parseInt(numeroInicial);
    const nf = parseInt(numeroFinal);
    if (isNaN(ni) || isNaN(nf) || ni <= 0 || nf <= 0) {
      toast.error("Informe números válidos.");
      return;
    }
    if (nf < ni) {
      toast.error("O número final deve ser maior ou igual ao inicial.");
      return;
    }
    if (justificativa.trim().length < 15) {
      toast.error("A justificativa deve ter no mínimo 15 caracteres.");
      return;
    }

    setSaving(true);
    let sefazStatus = "pendente";

    // Try SEFAZ if we have emitente and cert password
    if (emitenteAtivo && certSenha) {
      // Verificar proxy local
      const proxyOk = await checkProxyHealth();
      if (!proxyOk) {
        toast.error("Proxy SEFAZ offline! Verifique a VPS.");
        setSaving(false);
        return;
      }

      try {
        // Step 1: Preparar XML
        const { data: prepareResult, error: fnError } = await supabase.functions.invoke("sefaz-evento", {
          body: {
            prepare_only: true,
            tipo: "inutilizacao",
            emitente_id: emitenteAtivo.id,
            cert_senha: certSenha,
            ambiente: "1",
            ano: parseInt(ano),
            serie,
            numero_inicial: ni,
            numero_final: nf,
            justificativa: justificativa.trim(),
          },
        });

        if (fnError || !prepareResult?.success) {
          toast.error("Erro ao preparar inutilização: " + (fnError?.message || prepareResult?.error || "Erro desconhecido"));
          setSaving(false);
          return;
        }

        // Step 2: Transmitir via proxy local
        toast.info("Transmitindo inutilização para a SEFAZ...");
        const proxyResult = await transmitViLocalProxy({
          sefaz_url: prepareResult.sefaz_url,
          soap_xml: prepareResult.soap_xml,
          cert_pem: prepareResult.cert_pem,
          key_pem: prepareResult.key_pem,
        });

        // Step 3: Parse resposta
        const sefazResponse = parseEventoResponse(proxyResult.responseXml);
        const successCodes = ["102", "128", "135", "101"];
        const isSuccess = successCodes.includes(sefazResponse.cStat);

        if (isSuccess) {
          toast.success(`SEFAZ: ${sefazResponse.xMotivo} (Protocolo: ${sefazResponse.nProt || "N/A"})`);
          sefazStatus = "processado";
        } else {
          toast.warning(`SEFAZ rejeitou: ${sefazResponse.xMotivo || "Erro desconhecido"}`);
          sefazStatus = "rejeitado";
        }
      } catch (err: any) {
        console.error("Erro ao chamar SEFAZ:", err);
        toast.warning("Não foi possível enviar à SEFAZ. Salvo localmente.");
      }
    }

    const { error } = await supabase.from("inutilizacoes").insert({
      serie,
      numero_inicial: ni,
      numero_final: nf,
      justificativa: justificativa.trim(),
      ano: parseInt(ano),
      status: sefazStatus,
    });

    if (error) {
      toast.error("Erro ao registrar inutilização.");
      console.error(error);
    } else {
      toast.success("Inutilização registrada!");
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("inutilizacoes").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover."); console.error(error); }
    else { toast.success("Removida."); fetchData(); }
  };

  const statusLabel: Record<string, { text: string; className: string }> = {
    pendente: { text: "Pendente", className: "bg-muted text-muted-foreground" },
    processado: { text: "Processado", className: "bg-success/10 text-success" },
    rejeitado: { text: "Rejeitado", className: "bg-destructive/10 text-destructive" },
  };

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Inutilização de Numeração</h2>
          <p className="text-sm text-muted-foreground">Inutilizar faixas de numeração de NF-e na SEFAZ</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Inutilização
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-6 animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Inutilizar Numeração</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive">
                A inutilização informa à SEFAZ que os números indicados não serão utilizados. Esta ação é irreversível após processamento.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Ano</Label>
              <Input value={ano} onChange={e => setAno(e.target.value)} placeholder="2026" className="mt-1" />
            </div>
            <div>
              <Label>Série</Label>
              <Input value={serie} onChange={e => setSerie(e.target.value)} placeholder="1" className="mt-1" />
            </div>
            <div>
              <Label>Nº Inicial</Label>
              <Input type="number" value={numeroInicial} onChange={e => setNumeroInicial(e.target.value)} placeholder="1" className="mt-1" />
            </div>
            <div>
              <Label>Nº Final</Label>
              <Input type="number" value={numeroFinal} onChange={e => setNumeroFinal(e.target.value)} placeholder="10" className="mt-1" />
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <Label>Justificativa (mín. 15 caracteres)</Label>
              <Input value={justificativa} onChange={e => setJustificativa(e.target.value)} placeholder="Motivo da inutilização..." className="mt-1" />
              <p className="mt-1 text-xs text-muted-foreground">{justificativa.length}/15 caracteres mínimos</p>
            </div>
            {emitenteAtivo?.cert_file_path && (
              <div className="sm:col-span-2 lg:col-span-5">
                <Label>Senha do Certificado Digital (para envio à SEFAZ)</Label>
                <Input
                  type="password"
                  value={certSenha}
                  onChange={e => setCertSenha(e.target.value)}
                  placeholder="Senha do certificado A1..."
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Deixe em branco para salvar apenas localmente sem enviar à SEFAZ.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Inutilização
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Nenhuma inutilização registrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ano</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Série</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nº Inicial</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nº Final</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Justificativa</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(item => {
                const st = statusLabel[item.status] || statusLabel.pendente;
                return (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{item.ano}</td>
                    <td className="px-4 py-3">{item.serie}</td>
                    <td className="px-4 py-3 font-mono">{item.numero_inicial}</td>
                    <td className="px-4 py-3 font-mono">{item.numero_final}</td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-[200px] truncate">{item.justificativa}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.className}`}>
                        {st.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status === "pendente" && (
                        <button onClick={() => remove(item.id)} className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default Inutilizacoes;
