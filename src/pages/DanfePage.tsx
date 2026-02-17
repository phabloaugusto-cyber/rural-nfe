import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import DanfePreview from "@/components/DanfePreview";
import { Button } from "@/components/ui/button";
import { Download, Printer, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface DanfeData {
  numero: string;
  serie: string;
  dataEmissao: string;
  naturezaOperacao: string;
  cfop: string;
  emitente: { razaoSocial: string; cnpj: string; ie: string; endereco: string; cidade: string; uf: string; cep: string };
  destinatario: { nome: string; cpfCnpj: string; ie: string; propriedade: string; endereco: string; cidade: string; uf: string; cep: string };
  itens: { id: string; codigoSefaz?: string; descricao: string; ncm: string; quantidade: number; valorUnitario: number; valorTotal: number; lote: string; raca?: string; peso?: number }[];
  valorTotal: number;
  informacoesAdicionais: string;
  transportador?: { nome: string; placa: string; uf: string; cpfCnpj?: string; rntrc?: string };
  status?: string;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
}

const DanfePage = () => {
  const [searchParams] = useSearchParams();
  const notaId = searchParams.get("id");
  const [data, setData] = useState<DanfeData | null>(null);
  const [loading, setLoading] = useState(!!notaId);
  const [generating, setGenerating] = useState(false);
  const [dataSaida, setDataSaida] = useState("");
  const danfeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notaId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: nota } = await supabase.from("notas_fiscais").select("*").eq("id", notaId).maybeSingle();
      if (!nota) { toast.error("Nota não encontrada."); setLoading(false); return; }

      const { data: itens } = await supabase.from("nfe_itens").select("*").eq("nota_fiscal_id", notaId);

      const cfopMap: Record<string, string> = { simples_remessa: "5.923", retorno_origem: "5.918", nota_entrada: "1.914" };

      setData({
        numero: nota.numero,
        serie: nota.serie,
        dataEmissao: new Date(nota.data_emissao + "T00:00:00").toLocaleDateString("pt-BR"),
        naturezaOperacao: nota.natureza_operacao,
        cfop: cfopMap[nota.tipo_nota] || "5.923",
        emitente: {
          razaoSocial: nota.emitente_razao_social, cnpj: nota.emitente_cpf_cnpj,
          ie: nota.emitente_ie || "", endereco: nota.emitente_endereco || "",
          cidade: nota.emitente_cidade || "", uf: nota.emitente_uf || "", cep: nota.emitente_cep || "",
        },
        destinatario: {
          nome: nota.destinatario_razao_social, cpfCnpj: nota.destinatario_cpf_cnpj,
          ie: nota.destinatario_ie || "", propriedade: nota.destinatario_propriedade || "",
          endereco: nota.destinatario_endereco || "", cidade: nota.destinatario_cidade || "",
          uf: nota.destinatario_uf || "", cep: nota.destinatario_cep || "",
        },
        itens: (itens || []).map(i => ({
          id: i.id, codigoSefaz: i.codigo_sefaz || "", descricao: i.descricao, ncm: i.ncm,
          quantidade: i.quantidade, valorUnitario: Number(i.valor_unitario), valorTotal: Number(i.valor_total),
          lote: i.lote || "", raca: i.raca || "", peso: i.peso ? Number(i.peso) : 0,
        })),
        valorTotal: Number(nota.valor_total),
        informacoesAdicionais: nota.observacoes || "",
        status: nota.status,
        chaveAcesso: nota.chave_acesso || undefined,
        protocoloAutorizacao: nota.protocolo_autorizacao || undefined,
        transportador: nota.transportador_nome ? {
          nome: nota.transportador_nome,
          placa: nota.transportador_placa || "",
          uf: nota.transportador_uf || "",
          cpfCnpj: nota.transportador_cpf_cnpj || "",
          rntrc: nota.transportador_rntrc || "",
        } : undefined,
      });
      setDataSaida(new Date(nota.data_emissao + "T00:00:00").toLocaleDateString("pt-BR"));
      setLoading(false);
    };
    fetch();
  }, [notaId]);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!danfeRef.current) return null;

    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MARGIN_MM = 5;
    const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;

    const sections = Array.from(
      danfeRef.current.querySelectorAll("[data-pdf-section]")
    ) as HTMLElement[];

    // Fallback: if no sections found, capture the whole thing as before
    if (sections.length === 0) {
      const canvas = await html2canvas(danfeRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
      return pdf.output("blob");
    }

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let currentY = MARGIN_MM;

    for (const section of sections) {
      const canvas = await html2canvas(section, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const scaleFactor = CONTENT_WIDTH_MM / (canvas.width / 2);
      const heightMM = (canvas.height / 2) * scaleFactor;
      const remainingSpace = A4_HEIGHT_MM - MARGIN_MM - currentY;

      if (heightMM > remainingSpace && currentY > MARGIN_MM) {
        pdf.addPage();
        currentY = MARGIN_MM;
      }

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, heightMM);
      currentY += heightMM;
    }

    return pdf.output("blob");
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const blob = await generatePdfBlob();
      if (!blob) { toast.error("Erro ao gerar PDF."); setGenerating(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data ? `DANFE_${data.numero}_${data.serie}.pdf` : "DANFE.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    }
    setGenerating(false);
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handlePrint = () => {
    if (isMobile) {
      // On mobile, use window.print() directly — CSS handles hiding
      window.print();
      return;
    }
    // On desktop, clone approach for clean single-page print
    if (!danfeRef.current) return;
    const printContainer = document.createElement("div");
    printContainer.id = "danfe-print-container";
    printContainer.innerHTML = danfeRef.current.innerHTML;
    const root = document.getElementById("root");
    if (root) root.style.display = "none";
    document.body.appendChild(printContainer);
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        document.body.removeChild(printContainer);
        if (root) root.style.display = "";
      }, 100);
    });
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">DANFE</h2>
          <p className="text-sm text-muted-foreground">
            {notaId ? "Visualização da DANFE da nota fiscal" : "Selecione uma nota fiscal para visualizar o DANFE"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={handleDownloadPDF} disabled={generating}>
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Baixar PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando nota...</span>
        </div>
      ) : !data ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          Nenhuma nota selecionada. Acesse a lista de Notas Fiscais e clique em uma nota para visualizar o DANFE.
        </div>
      ) : (
        <div id="danfe-print-area-wrapper" className="overflow-auto rounded-lg border border-border bg-white p-4 shadow-sm print:border-none print:p-0 print:shadow-none print:overflow-visible">
          <div ref={danfeRef} id="danfe-print-area">
            <DanfePreview {...data} dataSaida={dataSaida} onDataSaidaChange={setDataSaida} />
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DanfePage;
