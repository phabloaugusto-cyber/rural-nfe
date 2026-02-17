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
  transportador?: {
    nome: string;
    placa: string;
    uf: string;
    cpfCnpj?: string;
    rntrc?: string;
  };
  status?: string;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
}

const A4 = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 6, // margem real na impressão
};

function calcDensity(itemCount: number, infoLen: number) {
  // Objetivo: 1 página.
  // Poucos itens => mais espaçamento.
  // Muitos itens ou info grande => compacta.

  if (itemCount <= 1 && infoLen < 250) {
    return {
      fontSize: "11px",
      cellPad: "3px 4px",
      lineHeight: "1.25",
      // força o “miolo” ocupar a altura do A4
      minPageHeight: `${A4.heightMm - A4.marginMm * 2}mm`,
    };
  }

  if (itemCount <= 3 && infoLen < 600) {
    return {
      fontSize: "10.5px",
      cellPad: "2.5px 3.5px",
      lineHeight: "1.22",
      minPageHeight: `${A4.heightMm - A4.marginMm * 2}mm`,
    };
  }

  if (itemCount <= 8 && infoLen < 1000) {
    return {
      fontSize: "10px",
      cellPad: "2px 3px",
      lineHeight: "1.18",
      minPageHeight: `${A4.heightMm - A4.marginMm * 2}mm`,
    };
  }

  // “modo compacto” (muitos itens / info enorme)
  return {
    fontSize: "9.25px",
    cellPad: "1.5px 2.5px",
    lineHeight: "1.12",
    minPageHeight: `${A4.heightMm - A4.marginMm * 2}mm`,
  };
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

      const { data: itens } = await supabase
        .from("nfe_itens")
        .select("*")
        .eq("nota_fiscal_id", notaId);

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

  const density = useMemo(() => {
    const itemCount = data?.itens?.length || 0;
    const infoLen = (data?.informacoesAdicionais || "").length;
    return calcDensity(itemCount, infoLen);
  }, [data]);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!danfeRef.current) return null;

    // Antes de capturar, garante “modo print” (para respeitar mm e A4)
    document.documentElement.classList.add("danfe-force-print");
    await new Promise((r) => setTimeout(r, 50));

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const canvas = await html2canvas(danfeRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: danfeRef.current.scrollWidth,
      windowHeight: danfeRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");

    const pageW = A4.widthMm;
    const pageH = A4.heightMm;
    const margin = A4.marginMm;

    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2;

    // Ajusta a imagem para caber no conteúdo A4
    const imgW = contentW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // Se por algum motivo passar de 1 página, reduz a escala para caber numa só
    const finalH = Math.min(imgH, contentH);
    const finalW = (finalH * canvas.width) / canvas.height;

    const x = (pageW - finalW) / 2;
    const y = margin;

    pdf.addImage(imgData, "PNG", x, y, finalW, finalH);

    document.documentElement.classList.remove("danfe-force-print");
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
    window.print();
  };

  return (
    <AppLayout>
      {/* CSS do DANFE fica aqui (injeção local) */}
      <style>{`
        /* ======= PRINT A4 REAL ======= */
        @page {
          size: A4;
          margin: ${A4.marginMm}mm;
        }

        /* Evita “margem extra” do navegador */
        @media print {
          html, body {
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Esconde layout do app e deixa só a área do danfe */
          .app-layout-shell,
          header,
          nav,
          aside,
          .no-print {
            display: none !important;
          }

          #danfe-print-area-wrapper {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            overflow: visible !important;
          }
        }

        /* ======= A4 no SCREEN (preview) ======= */
        :root {
          --danfe-font-size: ${density.fontSize};
          --danfe-cell-pad: ${density.cellPad};
          --danfe-line-height: ${density.lineHeight};
          --danfe-min-page-height: ${density.minPageHeight};
        }

        /* Tamanho físico do A4 na tela */
        #danfe-print-area {
          width: ${A4.widthMm}mm;
          /* altura mínima do conteúdo (sem “estourar”) */
          min-height: var(--danfe-min-page-height);
          background: #fff;
          color: #000;
          margin: 0 auto;
        }

        /* O componente (primeiro filho) vira uma “página” */
        #danfe-print-area > * {
          width: 100%;
          min-height: var(--danfe-min-page-height);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        /* Tentativa de “empurrar” o último bloco para o rodapé (normalmente Infos Adicionais) */
        #danfe-print-area > * > :last-child {
          margin-top: auto;
        }

        /* Ajustes genéricos (funciona bem se DanfePreview usar tables/divs) */
        #danfe-print-area, 
        #danfe-print-area * {
          box-sizing: border-box;
          font-size: var(--danfe-font-size);
          line-height: var(--danfe-line-height);
        }

        #danfe-print-area table {
          width: 100%;
          border-collapse: collapse;
        }

        #danfe-print-area td,
        #danfe-print-area th {
          padding: var(--danfe-cell-pad);
        }

        /* Evita quebra de linha estranha na impressão */
        @media print {
          #danfe-print-area {
            width: ${A4.widthMm - A4.marginMm * 2}mm;
            min-height: ${A4.heightMm - A4.marginMm * 2}mm;
            margin: 0 !important;
          }

          #danfe-print-area > * {
            min-height: ${A4.heightMm - A4.marginMm * 2}mm;
          }

          /* Garante “1 página” ao máximo */
          #danfe-print-area, #danfe-print-area * {
            page-break-inside: avoid !important;
          }
        }

        /* Ajuda html2canvas/pdf a pegar no “modo print” */
        .danfe-force-print #danfe-print-area {
          width: ${A4.widthMm - A4.marginMm * 2}mm;
          margin: 0 !important;
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
