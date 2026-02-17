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

const A4 = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  MARGIN_MM: 5,
};

const DanfePage = () => {
  const [searchParams] = useSearchParams();
  const notaId = searchParams.get("id");

  const [data, setData] = useState<DanfeData | null>(null);
  const [loading, setLoading] = useState(!!notaId);
  const [generating, setGenerating] = useState(false);
  const [dataSaida, setDataSaida] = useState("");

  const danfeRef = useRef<HTMLDivElement>(null);

  const isMobile = useMemo(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent), []);

  useEffect(() => {
    if (!notaId) return;

    const fetch = async () => {
      setLoading(true);

      const { data: nota, error: notaErr } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("id", notaId)
        .maybeSingle();

      if (notaErr) {
        console.error(notaErr);
        toast.error("Erro ao buscar nota.");
        setLoading(false);
        return;
      }

      if (!nota) {
        toast.error("Nota não encontrada.");
        setLoading(false);
        return;
      }

      const { data: itens, error: itensErr } = await supabase
        .from("nfe_itens")
        .select("*")
        .eq("nota_fiscal_id", notaId);

      if (itensErr) {
        console.error(itensErr);
        toast.error("Erro ao buscar itens.");
        setLoading(false);
        return;
      }

      const cfopMap: Record<string, string> = {
        simples_remessa: "5.923",
        retorno_origem: "5.918",
        nota_entrada: "1.914",
      };

      const emissaoBR = new Date(nota.data_emissao + "T00:00:00").toLocaleDateString("pt-BR");

      setData({
        numero: nota.numero,
        serie: nota.serie,
        dataEmissao: emissaoBR,
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
          quantidade: Number(i.quantidade),
          valorUnitario: Number(i.valor_unitario),
          valorTotal: Number(i.valor_total),
          lote: i.lote || "",
          raca: i.raca || "",
          peso: i.peso ? Number(i.peso) : undefined,
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

      setDataSaida(emissaoBR);
      setLoading(false);
    };

    fetch();
  }, [notaId]);

  // PDF sempre em 1 página A4 (se passar da altura, reduz a escala pra caber)
  const generatePdfBlobSinglePage = async (): Promise<Blob | null> => {
    if (!danfeRef.current) return null;

    // Dica: scale=2 costuma ficar bem nítido sem explodir memória
    const canvas = await html2canvas(danfeRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: danfeRef.current.scrollWidth,
      windowHeight: danfeRef.current.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const contentW = A4.WIDTH_MM - A4.MARGIN_MM * 2;
    const contentH = A4.HEIGHT_MM - A4.MARGIN_MM * 2;

    // Tamanho da imagem no PDF respeitando proporção
    let imgW = contentW;
    let imgH = (canvas.height * imgW) / canvas.width;

    // Se ultrapassar a altura do A4 útil, reduz para caber
    if (imgH > contentH) {
      imgH = contentH;
      imgW = (canvas.width * imgH) / canvas.height;
    }

    const x = (A4.WIDTH_MM - imgW) / 2;
    const y = Math.max(A4.MARGIN_MM, (A4.HEIGHT_MM - imgH) / 2);

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", x, y, imgW, imgH);

    return pdf.output("blob");
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const blob = await generatePdfBlobSinglePage();
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
    // Em geral o print do navegador respeita melhor CSS A4 do que canvas->pdf
    window.print();
  };

  return (
    <AppLayout>
      {/* CSS do DANFE/print está aqui (A4 real + margens) */}
      <style>{`
        /* A4 no print */
        @page {
          size: A4 portrait;
          margin: ${A4.MARGIN_MM}mm;
        }

        /* Esconde o resto e imprime só o DANFE */
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* remove fundos do app */
          #root {
            background: white !important;
          }

          /* wrapper externo não deve cortar nada */
          #danfe-print-area-wrapper {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: transparent !important;
          }

          /* Área do danfe com tamanho A4 */
          #danfe-print-area {
            width: ${A4.WIDTH_MM}mm;
            min-height: ${A4.HEIGHT_MM}mm;
            margin: 0 auto;
            background: #fff;
          }

          /* Não imprimir botões/topo */
          .danfe-actions {
            display: none !important;
          }
        }

        /* Na tela: mostra tipo “folha A4” centralizada */
        #danfe-print-area {
          width: ${A4.WIDTH_MM}mm;
          min-height: ${A4.HEIGHT_MM}mm;
          margin: 0 auto;
          background: #fff;
        }
      `}</style>

      <div className="mb-6 flex items-center justify-between danfe-actions">
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
          id="danfe-print-area-wrapper"
          className="overflow-auto rounded-lg border border-border bg-white p-4 shadow-sm print:border-none print:p-0 print:shadow-none print:overflow-visible"
        >
          <div ref={danfeRef} id="danfe-print-area">
            <DanfePreview {...data} dataSaida={dataSaida} onDataSaidaChange={setDataSaida} />
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DanfePage;
