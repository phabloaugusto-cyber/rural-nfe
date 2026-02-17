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

const MM_TO_PX = 96 / 25.4;

const A4 = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 6, // ajuste fino aqui (margem “real”)
};

function mmToPx(mm: number) {
  return mm * MM_TO_PX;
}

const DanfePage = () => {
  const [searchParams] = useSearchParams();
  const notaId = searchParams.get("id");

  const [data, setData] = useState<DanfeData | null>(null);
  const [loading, setLoading] = useState(!!notaId);
  const [generating, setGenerating] = useState(false);
  const [dataSaida, setDataSaida] = useState("");

  // refs do layout A4
  const pageRef = useRef<HTMLDivElement>(null); // caixa A4 “útil”
  const contentRef = useRef<HTMLDivElement>(null); // conteúdo real do DanfePreview

  const [scale, setScale] = useState(1);

  const isMobile = useMemo(
    () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    []
  );

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

  // Auto-scale: cabe em 1 página A4 (área útil)
  useEffect(() => {
    if (!data) return;

    const recompute = () => {
      const pageEl = pageRef.current;
      const contentEl = contentRef.current;
      if (!pageEl || !contentEl) return;

      // área útil dentro da página (sem margens)
      const targetW = mmToPx(A4.widthMm - A4.marginMm * 2);
      const targetH = mmToPx(A4.heightMm - A4.marginMm * 2);

      // tamanho real do conteúdo
      // (usa scrollWidth/scrollHeight pra pegar o tamanho “natural”)
      const contentW = contentEl.scrollWidth || contentEl.getBoundingClientRect().width;
      const contentH = contentEl.scrollHeight || contentEl.getBoundingClientRect().height;

      if (!contentW || !contentH) return;

      const scaleW = targetW / contentW;
      const scaleH = targetH / contentH;

      // pega o menor pra caber largura e altura
      let next = Math.min(scaleW, scaleH);

      // limites: evita ficar gigante demais ou pequeno demais
      next = Math.max(0.65, Math.min(next, 1.35));

      setScale(next);
    };

    // roda agora e também quando o layout muda
    recompute();

    const ro = new ResizeObserver(() => recompute());
    if (contentRef.current) ro.observe(contentRef.current);

    // pequeno delay porque às vezes fontes/imagens carregam depois
    const t = window.setTimeout(recompute, 150);

    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [data, dataSaida]);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!pageRef.current) return null;

    // captura a página A4 inteira (já com scale aplicado)
    const canvas = await html2canvas(pageRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // encaixa 100% no A4
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);

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
      {/* Estilos A4 + impressão */}
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body {
            background: #ffffff !important;
          }
          #app-header, #app-sidebar, #danfe-actions {
            display: none !important;
          }
          #danfe-screen-wrapper {
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          #danfe-outer {
            display: block !important;
          }
        }

        /* A4 container */
        #danfe-outer {
          width: ${A4.widthMm}mm;
          height: ${A4.heightMm}mm;
          background: #fff;
        }

        /* Área útil (com margens) */
        #danfe-page {
          width: ${A4.widthMm - A4.marginMm * 2}mm;
          height: ${A4.heightMm - A4.marginMm * 2}mm;
          margin: ${A4.marginMm}mm;
          overflow: hidden;
          position: relative;
        }

        /* Conteúdo escalado */
        #danfe-scaled {
          transform-origin: top left;
          transform: scale(${scale});
          width: fit-content;
        }

        /* Só pra ficar bonito na tela */
        #danfe-screen-wrapper {
          background: #fff;
        }
      `}</style>

      <div className="mb-6 flex items-center justify-between" id="danfe-actions">
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
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
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
          id="danfe-screen-wrapper"
          className="overflow-auto rounded-lg border border-border bg-white p-4 shadow-sm print:border-none print:p-0 print:shadow-none print:overflow-visible"
        >
          {/* “Folha A4” */}
          <div
            id="danfe-outer"
            className="mx-auto"
            style={{
              // na tela, dá um respiro e evita colar nas bordas
              boxShadow: isMobile ? "none" : "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            <div id="danfe-page" ref={pageRef}>
              <div id="danfe-scaled">
                <div ref={contentRef}>
                  <DanfePreview {...data} dataSaida={dataSaida} onDataSaidaChange={setDataSaida} />
                </div>
              </div>
            </div>
          </div>

          {/* dica visual (só tela) */}
          <div className="mt-3 text-center text-xs text-muted-foreground print:hidden">
            Ajuste automático ativo (scale: {scale.toFixed(2)}). Se tiver muitos itens, ele reduz para caber em 1 página.
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DanfePage;
