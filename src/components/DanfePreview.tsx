import Barcode from "react-barcode";
import { useEffect, useRef } from "react";
import { NFeItem } from "@/types/nfe";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

interface DanfePreviewProps {
  numero?: string;
  serie?: string;
  chave?: string;
  protocolo?: string;
  emitente?: any;
  destinatario?: any;
  itens?: NFeItem[];
  total?: number;
  natureza?: string;
  dataEmissao?: string;
  placa?: string;
  informacoesAdicionais?: string;
}

export default function DanfePreview(props: DanfePreviewProps) {
  const itens = props.itens || [];

  const containerRef = useRef<HTMLDivElement>(null);
  const itensRef = useRef<HTMLDivElement>(null);
  const adicionaisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ajustarLayout();
    window.addEventListener("resize", ajustarLayout);

    return () => window.removeEventListener("resize", ajustarLayout);
  }, [props]);

  function ajustarLayout() {
    const container = containerRef.current;
    const itensBox = itensRef.current;
    const adicionaisBox = adicionaisRef.current;

    if (!container || !itensBox || !adicionaisBox) return;

    const alturaPagina = 1122; // A4 em px (96dpi)
    const topo = adicionaisBox.getBoundingClientRect().top;
    const topoPagina = container.getBoundingClientRect().top;

    const alturaUsada = topo - topoPagina;

    const alturaRestante = alturaPagina - alturaUsada - 40;

    if (alturaRestante > 50) {
      itensBox.style.minHeight = `${alturaRestante}px`;
    }
  }

  return (
    <div
      ref={containerRef}
      className="bg-white mx-auto shadow text-[11px]"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "10mm",
        fontFamily: "Arial",
      }}
    >

      {/* HEADER */}
      <div className="border border-black p-2 mb-2 flex justify-between">
        <div>
          <b>{props.emitente?.nome}</b><br />
          {props.emitente?.endereco}
        </div>

        <div className="text-center">
          <b>DANFE</b><br />
          Nº {props.numero}
        </div>

        <div>
          {props.chave && (
            <Barcode
              value={props.chave}
              height={40}
              width={1.2}
              fontSize={10}
              displayValue={false}
            />
          )}
        </div>
      </div>

      {/* DESTINATARIO */}
      <div className="border border-black p-2 mb-2">
        <b>DESTINATÁRIO</b><br />
        {props.destinatario?.nome}
      </div>

      {/* ITENS */}
      <div className="border border-black mb-2">

        <div className="bg-gray-100 border-b border-black p-1 font-bold">
          DADOS DO PRODUTO / SERVIÇO
        </div>

        <div ref={itensRef}>

          <table className="w-full border-collapse">

            <thead>
              <tr>
                <th className="border p-1 text-left">Descrição</th>
                <th className="border p-1">Qtd</th>
                <th className="border p-1">Unit</th>
                <th className="border p-1">Total</th>
              </tr>
            </thead>

            <tbody>

              {itens.map((item, i) => (
                <tr key={i}>
                  <td className="border p-1">
                    {item.descricao}
                  </td>

                  <td className="border p-1 text-center">
                    {formatNumber(item.quantidade)}
                  </td>

                  <td className="border p-1 text-right">
                    {formatCurrency(item.valorUnitario)}
                  </td>

                  <td className="border p-1 text-right">
                    {formatCurrency(item.valorTotal)}
                  </td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* INFORMAÇÕES ADICIONAIS */}
      <div
        ref={adicionaisRef}
        className="border border-black p-2"
      >
        <b>INFORMAÇÕES ADICIONAIS</b><br />
        {props.informacoesAdicionais}
      </div>

    </div>
  );
}
