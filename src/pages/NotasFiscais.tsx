import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import NFeTable from "@/components/NFeTable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Ban, FileEdit, FileDown, Trash2, Send, Copy, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NFe, TipoNota } from "@/types/nfe";
import { toast } from "sonner";
import { useEmitente } from "@/contexts/EmitenteContext";
import { generateNFeXml } from "@/lib/generateNFeXml";
import {
  checkProxyHealth,
  transmitViLocalProxy,
  parseAutorizacaoResponse,
  parseEventoResponse,
} from "@/lib/sefazLocalTransmit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const formatDateISO = (date: Date) => date.toISOString().split("T")[0];

const NotasFiscais = () => {
  const { emitenteAtivo, refetch: refetchEmitente } = useEmitente();
  const [notas, setNotas] = useState<NFe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [dataFiltro, setDataFiltro] = useState(formatDateISO(new Date()));
  const [filtrarPorData, setFiltrarPorData] = useState(true);

  // Dialog state
  const [dialogType, setDialogType] = useState<"cancelar" | "correcao" | "reenviar" | null>(null);
  const [selectedNota, setSelectedNota] = useState<NFe | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [certSenha, setCertSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSoapXml, setLastSoapXml] = useState<string | null>(null);

  // Delete dialog
  const [deleteNota, setDeleteNota] = useState<NFe | null>(null);

  const fetchNotas = async () => {
    setLoading(true);
    const { data: notasData } = await supabase
      .from("notas_fiscais")
      .select("*")
      .order("created_at", { ascending: false });

    if (!notasData || notasData.length === 0) {
      setNotas([]);
      setLoading(false);
      return;
    }

    const notaIds = notasData.map(n => n.id);
    const { data: itensData } = await supabase
      .from("nfe_itens")
      .select("*")
      .in("nota_fiscal_id", notaIds);

    const mapped: NFe[] = notasData.map(n => ({
      id: n.id,
      numero: n.numero,
      serie: n.serie,
      dataEmissao: n.data_emissao,
      tipoNota: n.tipo_nota as TipoNota,
      naturezaOperacao: n.natureza_operacao,
      status: n.status as NFe["status"],
      emitente: {
        razaoSocial: n.emitente_razao_social,
        cpfCnpj: n.emitente_cpf_cnpj,
        inscricaoEstadual: n.emitente_ie || "",
        propriedade: n.emitente_propriedade || "",
        endereco: n.emitente_endereco || "",
        cidade: n.emitente_cidade || "",
        uf: n.emitente_uf || "",
        cep: n.emitente_cep || "",
      },
      destinatario: {
        razaoSocial: n.destinatario_razao_social,
        cpfCnpj: n.destinatario_cpf_cnpj,
        inscricaoEstadual: n.destinatario_ie || "",
        propriedade: n.destinatario_propriedade || "",
        endereco: n.destinatario_endereco || "",
        cidade: n.destinatario_cidade || "",
        uf: n.destinatario_uf || "",
        cep: n.destinatario_cep || "",
      },
      itens: (itensData || [])
        .filter(i => i.nota_fiscal_id === n.id)
        .map(i => ({
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
        })),
      valorTotal: Number(n.valor_total),
      observacoes: n.observacoes || "",
      chaveAcesso: n.chave_acesso || "",
      protocoloAutorizacao: n.protocolo_autorizacao || "",
    }));

    setNotas(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchNotas(); }, []);

  const getSenhaFromDb = async () => {
    if (emitenteAtivo?.cert_senha) return emitenteAtivo.cert_senha;
    if (emitenteAtivo?.id) {
      const { data } = await supabase.from("emitentes").select("cert_senha").eq("id", emitenteAtivo.id).single();
      return data?.cert_senha || "";
    }
    return "";
  };

  const handleCancelar = async (nota: NFe) => {
    setSelectedNota(nota);
    setJustificativa("ERRO DE PREENCHIMENTO");
    setCertSenha(await getSenhaFromDb());
    setDialogType("cancelar");
  };

  const handleCartaCorrecao = async (nota: NFe) => {
    setSelectedNota(nota);
    setJustificativa("");
    setCertSenha(await getSenhaFromDb());
    setDialogType("correcao");
  };

  const handleReenviar = async (nota: NFe) => {
    setSelectedNota(nota);
    setCertSenha(await getSenhaFromDb());
    setDialogType("reenviar");
  };

  const handleReenviarConfirm = async () => {
    if (!selectedNota || !emitenteAtivo || !certSenha) return;
    setSaving(true);

    try {
      // Verificar proxy local
      const proxyOk = await checkProxyHealth();
      if (!proxyOk) {
        toast.error("Proxy SEFAZ offline! Verifique a VPS.");
        setSaving(false);
        return;
      }

      // Fetch note data from DB
      const { data: notaDb } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", selectedNota.id)
        .single();

      if (!notaDb) {
        toast.error("Nota não encontrada no banco de dados.");
        setSaving(false);
        return;
      }

      // Fetch items
      const { data: itensDb } = await supabase
        .from("nfe_itens")
        .select("*")
        .eq("nota_fiscal_id", selectedNota.id);

      const cfopMap: Record<string, string> = {
        simples_remessa: "5923",
        retorno_origem: "5918",
        nota_entrada: "1914",
      };

      toast.info("Preparando NF-e para reenvio...");

      // Step 1: Edge function prepara XML
      const { data: prepareResult, error: fnError } = await supabase.functions.invoke("sefaz-nfe", {
        body: {
          prepare_only: true,
          emitente_id: emitenteAtivo.id,
          cert_senha: certSenha,
          ambiente: "1",
          nota_fiscal_id: notaDb.id,
          numero: notaDb.numero,
          serie: notaDb.serie,
          data_emissao: notaDb.data_emissao,
          natureza_operacao: notaDb.natureza_operacao,
          tipo_nota: notaDb.tipo_nota,
          cfop: cfopMap[notaDb.tipo_nota] || "5923",
          emitente_data: {
            razao_social: notaDb.emitente_razao_social,
            cpf_cnpj: notaDb.emitente_cpf_cnpj,
            inscricao_estadual: notaDb.emitente_ie,
            endereco: notaDb.emitente_endereco,
            cidade: notaDb.emitente_cidade,
            uf: notaDb.emitente_uf,
            cep: notaDb.emitente_cep,
          },
          destinatario_data: {
            razao_social: notaDb.destinatario_razao_social,
            cpf_cnpj: notaDb.destinatario_cpf_cnpj,
            inscricao_estadual: notaDb.destinatario_ie,
            propriedade: notaDb.destinatario_propriedade,
            endereco: notaDb.destinatario_endereco,
            cidade: notaDb.destinatario_cidade,
            uf: notaDb.destinatario_uf,
            cep: notaDb.destinatario_cep,
          },
          itens: (itensDb || []).map((i) => ({
            codigo_sefaz: i.codigo_sefaz,
            descricao: i.descricao,
            ncm: i.ncm,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
            valor_total: i.valor_total,
          })),
          valor_total: notaDb.valor_total,
          informacoes_adicionais: notaDb.observacoes || "",
          transportador_data: notaDb.transportador_nome
            ? {
                nome: notaDb.transportador_nome,
                cpf_cnpj: notaDb.transportador_cpf_cnpj,
                placa: notaDb.transportador_placa,
                uf: notaDb.transportador_uf,
                rntrc: notaDb.transportador_rntrc,
              }
            : null,
        },
      });

      if (fnError || !prepareResult?.success) {
        toast.error("Erro ao preparar XML: " + (fnError?.message || prepareResult?.error || "Erro desconhecido"));
        setSaving(false);
        return;
      }

      // Step 2: Transmitir via proxy local
      toast.info("Transmitindo NF-e para a SEFAZ...");
      const proxyResult = await transmitViLocalProxy({
        sefaz_url: prepareResult.sefaz_url,
        soap_xml: prepareResult.soap_xml,
        cert_pem: prepareResult.cert_pem,
        key_pem: prepareResult.key_pem,
      });

      // Step 3: Parse resposta
      const rawXml = proxyResult.responseXml || "";
      console.log("=== SEFAZ RESPONSE XML ===");
      console.log("Length:", rawXml.length);
      console.log("Content:", rawXml);
      console.log("=== END SEFAZ RESPONSE ===");

      if (!rawXml || rawXml.trim().length === 0) {
        toast.error("SEFAZ retornou resposta vazia. Verifique o terminal do proxy para detalhes.", { duration: 15000 });
        setSaving(false);
        setDialogType(null);
        setSelectedNota(null);
        setCertSenha("");
        return;
      }
      
      const sefazResponse = parseAutorizacaoResponse(rawXml);
      console.log("Parsed SEFAZ response:", JSON.stringify(sefazResponse));
      
      const successCodes = ["100", "104"];
      const isSuccess = successCodes.includes(sefazResponse.cStat);

      if (isSuccess && sefazResponse.nProt) {
        await supabase.from("notas_fiscais").update({
          chave_acesso: prepareResult.chave_acesso,
          protocolo_autorizacao: sefazResponse.nProt,
          status: "emitida",
        }).eq("id", selectedNota.id);

        toast.success(`NF-e autorizada! Protocolo: ${sefazResponse.nProt} | Chave: ${prepareResult.chave_formatada}`);
      } else {
        toast.error(`SEFAZ retornou cStat: ${sefazResponse.cStat} — ${sefazResponse.xMotivo || "Sem motivo"}`, { duration: 10000 });
        // Extract only enviNFe block for SEFAZ-RS validator
        const soapStr = prepareResult.soap_xml || "";
        const match = soapStr.match(/<enviNFe[\s\S]*<\/enviNFe>/);
        setLastSoapXml(match ? match[0] : soapStr);
      }
    } catch (err: any) {
      console.error("Erro ao reenviar à SEFAZ:", err);
      toast.error("Erro ao reenviar à SEFAZ: " + err.message);
    }

    setSaving(false);
    setDialogType(null);
    setSelectedNota(null);
    setCertSenha("");
    fetchNotas();
  };

  const handleConfirm = async () => {
    if (!selectedNota || !dialogType) return;
    if (justificativa.trim().length < 15) {
      toast.error("A justificativa deve ter no mínimo 15 caracteres.");
      return;
    }

    setSaving(true);

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
        // Step 1: Preparar XML via edge function
        const { data: prepareResult, error: fnError } = await supabase.functions.invoke("sefaz-evento", {
          body: {
            prepare_only: true,
            tipo: dialogType === "cancelar" ? "cancelamento" : "carta_correcao",
            emitente_id: emitenteAtivo.id,
            cert_senha: certSenha,
            ambiente: "1",
            chave_acesso: selectedNota.chaveAcesso || "",
            protocolo_autorizacao: selectedNota.protocoloAutorizacao || "",
            justificativa: dialogType === "cancelar" ? justificativa.trim() : undefined,
            correcao: dialogType === "correcao" ? justificativa.trim() : undefined,
          },
        });

        if (fnError || !prepareResult?.success) {
          toast.error("Erro ao preparar evento: " + (fnError?.message || prepareResult?.error || "Erro desconhecido"));
          setSaving(false);
          return;
        }

        // Step 2: Transmitir via proxy local
        toast.info("Transmitindo evento para a SEFAZ...");
        const proxyResult = await transmitViLocalProxy({
          sefaz_url: prepareResult.sefaz_url,
          soap_xml: prepareResult.soap_xml,
          cert_pem: prepareResult.cert_pem,
          key_pem: prepareResult.key_pem,
        });

        // Step 3: Parse resposta
        const sefazResponse = parseEventoResponse(proxyResult.responseXml);
        const successCodes = ["128", "135", "102", "101", "573"];
        const isSuccess = successCodes.includes(sefazResponse.cStat);

        if (isSuccess) {
          toast.success(`SEFAZ: ${sefazResponse.xMotivo} (Protocolo: ${sefazResponse.nProt || "N/A"})`);
        } else {
          toast.warning(`SEFAZ rejeitou: ${sefazResponse.xMotivo || "Erro desconhecido"}`);
        }
      } catch (err: any) {
        console.error("Erro ao chamar SEFAZ:", err);
        toast.warning("Não foi possível enviar à SEFAZ. Evento salvo localmente.");
      }
    }

    // Save event locally regardless
    const { error: evError } = await supabase.from("eventos_fiscais").insert({
      nota_fiscal_id: selectedNota.id,
      tipo: dialogType === "cancelar" ? "cancelamento" : "carta_correcao",
      justificativa: justificativa.trim(),
      status: emitenteAtivo && certSenha ? "processado" : "pendente",
    });

    if (evError) {
      toast.error("Erro ao registrar evento fiscal.");
      console.error(evError);
      setSaving(false);
      return;
    }

    if (dialogType === "cancelar") {
      await supabase
        .from("notas_fiscais")
        .update({ status: "cancelada" })
        .eq("id", selectedNota.id);
    }

    toast.success(
      dialogType === "cancelar"
        ? "Cancelamento registrado!"
        : "Carta de Correção registrada!"
    );

    setSaving(false);
    setDialogType(null);
    setSelectedNota(null);
    setCertSenha("");
    fetchNotas();
  };

  const handleExcluir = (nota: NFe) => {
    setDeleteNota(nota);
  };

  const handleBaixarXml = async (nota: NFe) => {
    try {
      // Fetch full nota from DB
      const { data: notaDb } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", nota.id)
        .single();

      if (!notaDb) {
        toast.error("Nota não encontrada.");
        return;
      }

      const { data: itensDb } = await supabase
        .from("nfe_itens")
        .select("*")
        .eq("nota_fiscal_id", nota.id);

      const xml = generateNFeXml({
        ...notaDb,
        emitente_ie: notaDb.emitente_ie || "",
        destinatario_ie: notaDb.destinatario_ie || "",
        itens: (itensDb || []).map((i) => ({
          codigo_sefaz: i.codigo_sefaz || "",
          descricao: i.descricao,
          ncm: i.ncm,
          quantidade: i.quantidade,
          valor_unitario: Number(i.valor_unitario),
          valor_total: Number(i.valor_total),
        })),
      });

      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NFe_${notaDb.numero}_${notaDb.serie}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XML baixado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar XML: " + err.message);
    }
  };

  const handleExcluirConfirm = async () => {
    if (!deleteNota) return;
    setSaving(true);
    try {
      // Delete items first
      await supabase.from("nfe_itens").delete().eq("nota_fiscal_id", deleteNota.id);
      // Delete the note
      await supabase.from("notas_fiscais").delete().eq("id", deleteNota.id);

      // Revert emitente numbering if this was the latest number
      if (emitenteAtivo?.id) {
        const noteNumber = parseInt(deleteNota.numero, 10);
        if (!isNaN(noteNumber)) {
          const { data: emitData } = await supabase
            .from("emitentes")
            .select("numero_nota_atual")
            .eq("id", emitenteAtivo.id)
            .single();
          // If numero_nota_atual > noteNumber, it means this number was consumed, revert it
          if (emitData && emitData.numero_nota_atual > noteNumber) {
            await supabase
              .from("emitentes")
              .update({ numero_nota_atual: noteNumber })
              .eq("id", emitenteAtivo.id);
          }
        }
      }

      toast.success(`Nota nº ${deleteNota.numero} excluída. Numeração revertida.`);
      await refetchEmitente();
      fetchNotas();
    } catch (err: any) {
      toast.error("Erro ao excluir nota: " + err.message);
    }
    setSaving(false);
    setDeleteNota(null);
  };

  const filtered = notas.filter((n) => {
    const matchBusca =
      n.numero.includes(busca) ||
      n.destinatario.razaoSocial.toLowerCase().includes(busca.toLowerCase());
    const matchData = filtrarPorData ? n.dataEmissao === dataFiltro : true;
    return matchBusca && matchData;
  });

  return (
    <AppLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground">Notas Fiscais</h2>
        <p className="text-sm text-muted-foreground">Todas as notas fiscais emitidas</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou destinatário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="w-40"
          />
          <Button
            variant={filtrarPorData ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltrarPorData(!filtrarPorData)}
          >
            <CalendarIcon className="mr-1 h-4 w-4" />
            {filtrarPorData ? "Filtrado por data" : "Todas as datas"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Nenhuma nota fiscal encontrada{filtrarPorData ? ` para ${new Date(dataFiltro + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}.
        </div>
      ) : (
        <NFeTable
          notas={filtered}
          onCancelar={handleCancelar}
          onCartaCorrecao={handleCartaCorrecao}
          onReenviar={handleReenviar}
          onExcluir={handleExcluir}
          onBaixarXml={handleBaixarXml}
        />
      )}

      {lastSoapXml && (
        <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
              XML rejeitado pela SEFAZ — copie e valide em{" "}
              <a href="https://www.sefaz.rs.gov.br/NFE/NFE-VAL.aspx" target="_blank" rel="noopener noreferrer" className="underline">
                sefaz.rs.gov.br/NFE/NFE-VAL.aspx
              </a>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(lastSoapXml);
                  toast.success("XML copiado para a área de transferência!");
                }}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copiar XML
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLastSoapXml(null)}>✕</Button>
            </div>
          </div>
          <pre className="text-xs text-muted-foreground max-h-32 overflow-auto whitespace-pre-wrap break-all">
            {lastSoapXml.substring(0, 500)}...
          </pre>
        </div>
      )}

      {/* Dialog Cancelamento / Carta de Correção */}
      <Dialog open={dialogType === "cancelar" || dialogType === "correcao"} onOpenChange={(open) => { if (!open) { setDialogType(null); setSelectedNota(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "cancelar" ? "Cancelar Nota Fiscal" : "Carta de Correção (CC-e)"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "cancelar"
                ? `Cancelar a NF-e nº ${selectedNota?.numero}. Esta ação não pode ser desfeita.`
                : `Emitir Carta de Correção para a NF-e nº ${selectedNota?.numero}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Justificativa (mín. 15 caracteres)</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder={
                  dialogType === "cancelar"
                    ? "Motivo do cancelamento..."
                    : "Descrição da correção a ser aplicada..."
                }
                rows={4}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">{justificativa.length}/15 caracteres mínimos</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogType(null); setSelectedNota(null); setCertSenha(""); }}>
              Voltar
            </Button>
            <Button
              variant={dialogType === "cancelar" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={saving || justificativa.trim().length < 15}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogType === "cancelar" ? "Confirmar Cancelamento" : "Registrar CC-e"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Reenviar à SEFAZ */}
      <Dialog open={dialogType === "reenviar"} onOpenChange={(open) => { if (!open) { setDialogType(null); setSelectedNota(null); setCertSenha(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar NF-e à SEFAZ</DialogTitle>
            <DialogDescription>
              Reenviar a NF-e nº {selectedNota?.numero} para autorização na SEFAZ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogType(null); setSelectedNota(null); setCertSenha(""); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleReenviarConfirm}
              disabled={saving || !certSenha}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Reenviar à SEFAZ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Excluir Nota */}
      <AlertDialog open={!!deleteNota} onOpenChange={(open) => { if (!open) setDeleteNota(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Nota Fiscal</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a NF-e nº {deleteNota?.numero}? A numeração será revertida para uso futuro. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirConfirm}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default NotasFiscais;
