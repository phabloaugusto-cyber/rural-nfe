import { useEffect, useMemo, useRef, useState } from "react";
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
  emitente: {
    razaoSocial: string;
    cnpj: string;
    ie: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  destinatario: {
    nome: string;
    cpfCnpj: string;
    ie: string;
    propriedade: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  itens: {
    id: string;
    codigoSefaz?: string;
    descricao: string;
    ncm: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    lote: string;
    raca?: string;
    peso?: number;
  }[];
  valorTotal: number;
  informacoesAdicionais: string;
  transportador?: { nome: string; placa: string; uf: string; cpfCnpj?: string; rntrc?: string };
  status?: string;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 5;

// Aproximação em px pra pré-visualização na tela (não afeta impressão/PDF):
const A4_WIDTH_PX_AT_96DPI = 794; // ~210mm em 96dpi

const DanfePage = () => {
  const [searchParams] = useSearchParams();
  const notaId = searchParams.get("id");

  const [data, setData] = useState<DanfeData | null>(null);
  const [loading, setLoading] = useState(!!notaId);
  const [generating, setGenerating] = useState(false);
  const [dataSaida, setDataSaida] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const danfeRef = useRef<HTMLDivElement>(null);

  // Escala só para a tela (pra caber bonito no browser). No print/PDF fica 1:1.
  const [screenScale, setScreenScale] = useState(1);

  const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const el = wrapperRef.current;

    const computeScale = () => {
      // espaço disponível no wrapper (tira um "respiro" pra borda/padding)
      const w = el.clientWidth - 16;
      const s = Math.min(1, w / A4_WIDTH_PX_AT_96DPI);
      setScreenScale(Number.isFinite(s) && s > 0 ? s : 1);
    };

    computeScale();

    const ro = new ResizeObserver(() => computeScale());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!notaId) return;

    const fetch = async () => {
      setLoading(true);

      const { data: nota } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", notaId)
        .maybeSingle();

      if (!nota) {
        toast.error("Nota não encontrada.");
        setLoading(false);
        return;
      }

      const { data: itens } = await supabase.from("nfe_itens").select("*").eq("nota_fiscal_id", notaId);

      const cfopMap: Record<string, string> = {
        simples_remessa: "5.923",
        retorno_origem: "5.918",
        nota_entrada: "1.914",
      };

      setData({
        numero: nota.numero,
        serie: nota.serie,
        dataEmissao: new Date(nota.data_emissao + "T00:00:00").toLocaleDateString("pt-BR"),
        naturezaOperacao: nota.natureza_operacao,
        cfop: cfopMap[nota.tipo_nota] || "5.923",
        emitente: {
          razaoSocial: nota.emitente_razao_social,
          cnpj: nota.emitente_cpf_cnpj,
          ie: nota.emitente_ie || "",
          endereco: nota.emitente_endereco || "",
          cidade: nota.emitente_cidade || "",
          uf: nota.emitente_uf || "",
          cep: nota.emitente_cep || "",
        },
        destinatario: {
          nome: nota.destinatario_razao_social,
          cpfCnpj: nota.destinatario_cpf_cnpj,
          ie: nota.destinatario_ie || "",
          propriedade: nota.destinatario_propriedade || "",
          endereco: nota.destinatario_endereco || "",
          cidade: nota.destinatario_cidade || "",
          uf: nota.destinatario_uf || "",
          cep: nota.destinatario_cep || "",
        },
        itens: (itens || []).map((i: any) => ({
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
        valorTotal: Number(nota.valor_total),
        informacoesAdicionais: nota.observacoes || "",
        status: nota.status,
        chaveAcesso: nota.chave_acesso || undefined,
        protocoloAutorizacao: nota.protocolo_autorizacao || undefined,
        transportador: nota.transportador_nome
          ? {
              nome: nota.transportador_nome,
              placa: nota.transportador_placa || "",
              uf: nota.transportador_uf || "",
              cpfCnpj: nota.transportador_cpf_cnpj || "",
              rntrc: nota.transportador_rntrc || "",
            }
          : undefined,
      });

      setDataSaida(new Date(nota.data_emissao + "T00:00:00").toLocaleDateString("pt-BR"));
      setLoading(false);
    };

    fetch();
  }, [notaId]);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!danfeRef.current) return null;

    // Importante: para PDF, a gente captura o container A4 já no tamanho correto.
    const canvas = await html2canvas(danfeRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      // evita “cortar” sombras/bordas
      windowWidth: danfeRef.current.scrollWidth,
      windowHeight: danfeRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // Preenche a página com margem real:
    const contentW = pdfW - 2 * MARGIN_MM;
    const contentH = pdfH - 2 * MARGIN_MM;

    // Ajusta imagem para caber exatamente na área útil (mantendo proporção)
    const imgW = contentW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // Se por algum motivo ficar maior que o espaço, limita pela altura
    let finalW = imgW;
    let finalH = imgH;
    if (imgH > contentH) {
      finalH = contentH;
      finalW = (canvas.width * finalH) / canvas.height;
    }

    // centraliza dentro da área útil
    const x = MARGIN_MM + (contentW - finalW) / 2;
    const y = MARGIN_MM + (contentH - finalH) / 2;

    pdf.addImage(imgData, "PNG", x, y, finalW, finalH);
    return pdf.output("blob");
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const blob = await generatePdfBlob();
      if (!blob) {
        toast.error("Erro ao gerar PDF.");
        setGenerating(false);
        return;
      }
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

  const handlePrint = () => {
    // No mobile: window.print direto.
    if (isMobile) {
      window.print();
      return;
    }

    // Desktop: imprime a página com CSS de print.
    window.print();
  };

  return (
    <AppLayout>
      {/* CSS do DANFE (A4 real + “preencher a página” com flex) */}
      <style>{`
        /* Área A4 real (serve tanto pra print quanto pra PDF/canvas) */
        #danfe-a4 {
          width: ${A4_WIDTH_MM}mm;
          min-height: ${A4_HEIGHT_MM}mm;
          padding: ${MARGIN_MM}mm;
          box-sizing: border-box;
          background: #fff;

          /* Aqui é o pulo do gato: permite “empurrar” o último bloco pra baixo */
          display: flex;
          flex-direction: column;
          gap: 2mm;
        }

        /* Empurra o ÚLTIMO bloco (normalmente "Dados adicionais"/rodapé) pra preencher o A4 */
        #danfe-a4 > :last-child {
          margin-top: auto;
        }

        /* Pré-visualização na tela: escala para caber no viewport */
        @media screen {
          #danfe-a4 {
            transform: scale(var(--danfe-screen-scale, 1));
            transform-origin: top left;
          }
        }

        /* Impressão: tamanho real, sem escala, e remove backgrounds */
        @media print {
          @page {
            size: A4;
            margin: 0; /* a margem real já está no padding do #danfe-a4 */
          }

          body {
            background: #fff !important;
          }

          /* esconde botões e layout do app na impressão */
          .no-print {
            display: none !important;
          }

          /* garante que a área A4 fique 1:1 */
          #danfe-a4 {
            transform: none !important;
          }

          /* remove bordas/sombras do wrapper */
          #danfe-wrapper {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="mb-6 flex items-center justify-between no-print">
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
        <div
          id="danfe-wrapper"
          ref={wrapperRef}
          className="overflow-auto rounded-lg border border-border bg-white p-4 shadow-sm print:border-none print:p-0 print:shadow-none print:overflow-visible"
          style={{ ["--danfe-screen-scale" as any]: screenScale }}
        >
          {/* Esse é o “A4 real” */}
          <div ref={danfeRef} id="danfe-a4">
            <DanfePreview {...data} dataSaida={dataSaida} onDataSaidaChange={setDataSaida} />
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DanfePage;
