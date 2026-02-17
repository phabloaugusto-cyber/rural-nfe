import Barcode from "react-barcode";
import { NFeItem } from "@/types/nfe";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatNumber = (value: number) => (value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const onlyDigits = (s?: string) => (s || "").replace(/\D/g, "");

const formatCpfCnpj = (value?: string) => {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value || "";
};

const formatIe = (value?: string) => (value || "").trim();

const formatDate = (iso?: string) => {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("pt-BR");
};

const safe = (v?: string | null) => (v ?? "").toString();

function calcTotais(itens: NFeItem[]) {
  const vProd = itens.reduce((acc, it) => acc + (Number(it.vProd) || 0), 0);
  const vFrete = itens.reduce((acc, it) => acc + (Number(it.vFrete) || 0), 0);
  const vSeg = itens.reduce((acc, it) => acc + (Number(it.vSeg) || 0), 0);
  const vDesc = itens.reduce((acc, it) => acc + (Number(it.vDesc) || 0), 0);
  const vOutro = itens.reduce((acc, it) => acc + (Number(it.vOutro) || 0), 0);

  // Em muitos casos você já guarda vNF pronto; se não, calcula aqui:
  const vNF = vProd + vFrete + vSeg + vOutro - vDesc;

  return { vProd, vFrete, vSeg, vDesc, vOutro, vNF };
}

type Props = {
  danfe: any;
  pageNumber?: number;
  totalPages?: number;
  publicUrl?: string;
  generatedAt?: string;
};

export default function DanfePreview({
  danfe,
  pageNumber = 1,
  totalPages = 1,
  publicUrl,
  generatedAt,
}: Props) {
  const emit = danfe?.emitente || {};
  const dest = danfe?.destinatario || {};
  const transp = danfe?.transporte || {};
  const itens: NFeItem[] = danfe?.itens || [];
  const ide = danfe?.ide || {};
  const prot = danfe?.protocolo || {};
  const chave = safe(danfe?.chaveAcesso || danfe?.chave || "");
  const isCancelada = !!danfe?.isCancelada;

  const totais = calcTotais(itens);

  const natureza = safe(ide?.natOp || danfe?.naturezaOperacao || danfe?.natOp);
  const nNFe = safe(ide?.nNF || danfe?.numero || danfe?.nNF);
  const serie = safe(ide?.serie || danfe?.serie || "");
  const tpNF = String(ide?.tpNF ?? danfe?.tpNF ?? "1"); // 0=Entrada 1=Saída
  const tipoNota = tpNF === "0" ? "0 - ENTRADA" : "1 - SAÍDA";

  const dhEmi = safe(ide?.dhEmi || danfe?.dhEmi || danfe?.dataEmissao);
  const dhSaiEnt = safe(ide?.dhSaiEnt || danfe?.dhSaiEnt || danfe?.dataSaida);

  const vBC = safe(danfe?.totais?.vBC ?? danfe?.vBC);
  const vICMS = safe(danfe?.totais?.vICMS ?? danfe?.vICMS);
  const vBCST = safe(danfe?.totais?.vBCST ?? danfe?.vBCST);
  const vST = safe(danfe?.totais?.vST ?? danfe?.vST);
  const vIPI = safe(danfe?.totais?.vIPI ?? danfe?.vIPI);

  const vBCNum = Number(vBC) || 0;
  const vICMSNum = Number(vICMS) || 0;
  const vBCSTNum = Number(vBCST) || 0;
  const vSTNum = Number(vST) || 0;
  const vIPINum = Number(vIPI) || 0;

  const vProdNum = Number(danfe?.totais?.vProd ?? totais.vProd) || totais.vProd;
  const vNFNum = Number(danfe?.totais?.vNF ?? totais.vNF) || totais.vNF;

  const infoComp = safe(danfe?.infAdic?.infCpl || danfe?.infCpl || danfe?.informacoesComplementares);
  const reservadoFisco = safe(danfe?.infAdic?.infAdFisco || danfe?.infAdFisco || "");

  const vol = danfe?.volumes || {};

  return (
    <div className="mx-auto bg-white text-black border border-gray-300 shadow-sm rounded-sm overflow-hidden">
      <style>{`
        /* A4 fixo: o HTML já ocupa a página inteira, então o html2canvas/jsPDF não “encolhe” e não sobra branco */
        .danfe-spacer { flex: 1 1 auto; min-height: 0; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; }
        }
      `}</style>

      <div
        className="danfe-root relative text-[9px]"
        style={{
          width: "210mm",
          height: "297mm",
          padding: "6mm",
          boxSizing: "border-box",
          fontSize: "9px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Watermark CANCELADA */}
        {isCancelada && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-[70px] font-bold text-red-600/20 rotate-[-20deg] tracking-widest">
              CANCELADA
            </div>
          </div>
        )}

        {/* Topo: Recebemos de... */}
        <div className="border border-black">
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-10 p-1 text-[8px] leading-tight">
              RECEBEMOS DE <b>{safe(emit?.xNome)}</b> OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL
              INDICADA AO LADO. DEST.: <b>{safe(dest?.xNome)}</b> - VALOR TOTAL:{" "}
              <b>{formatCurrency(vNFNum)}</b>
            </div>
            <div className="col-span-2 p-1 text-right border-l border-black text-[9px]">
              <div className="font-bold">NF-e</div>
              <div className="font-bold">Nº {nNFe}</div>
              <div className="font-bold">SÉRIE {serie}</div>
            </div>
          </div>
          <div className="grid grid-cols-12">
            <div className="col-span-6 border-r border-black p-1 text-[8px]">
              DATA DO RECEBIMENTO
            </div>
            <div className="col-span-6 p-1 text-[8px]">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
          </div>
        </div>

        {/* Identificação do emitente / DANFE / Barcode */}
        <div className="border border-black border-t-0">
          <div className="grid grid-cols-12">
            <div className="col-span-5 border-r border-black p-2">
              <div className="font-bold text-[12px]">{safe(emit?.xNome)}</div>
              <div className="text-[9px] leading-tight">
                {safe(emit?.enderEmit?.xLgr)} {safe(emit?.enderEmit?.nro)} {safe(emit?.enderEmit?.xCpl)}
                <br />
                {safe(emit?.enderEmit?.xBairro)} - {safe(emit?.enderEmit?.xMun)} -{" "}
                {safe(emit?.enderEmit?.UF)}
                <br />
                CEP: {safe(emit?.enderEmit?.CEP)}
                <br />
                Fone: {safe(emit?.enderEmit?.fone)}
              </div>
            </div>

            <div className="col-span-2 border-r border-black p-2 text-center">
              <div className="font-bold text-[12px]">DANFE</div>
              <div className="text-[8px] leading-tight">
                DOCUMENTO AUXILIAR DA
                <br />
                NOTA FISCAL ELETRÔNICA
              </div>
              <div className="mt-1 text-[9px]">
                <div className="font-bold">{tipoNota}</div>
              </div>
              <div className="mt-2 border border-black inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold">
                {tpNF}
              </div>
              <div className="mt-2 text-[9px] font-bold">
                Nº {nNFe} fl. {pageNumber}/{totalPages}
              </div>
              <div className="text-[9px] font-bold">SÉRIE {serie}</div>
            </div>

            <div className="col-span-5 p-2">
              <div className="border border-black p-1">
                <div className="text-center text-[8px] font-bold mb-1">CHAVE DE ACESSO</div>
                <div className="text-center text-[8px] tracking-wider">{chave}</div>
              </div>

              <div className="mt-1 flex justify-center">
                <Barcode value={chave || "00000000000000000000000000000000000000000000"} height={40} />
              </div>

              <div className="border border-black p-1 mt-1 text-[8px] text-center leading-tight">
                Consulta de autenticidade no portal nacional da NF-e
                <br />
                www.nfe.fazenda.gov.br/portal ou no site da SEFAZ Autorizadora
              </div>

              {prot?.nProt && (
                <div className="border border-black p-1 mt-1 text-[8px] text-center">
                  <div className="font-bold">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
                  <div>{safe(prot?.nProt)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Natureza, IE, CNPJ */}
        <div className="border border-black border-t-0">
          <div className="grid grid-cols-12">
            <div className="col-span-9 border-r border-black p-1">
              <div className="text-[7px]">NATUREZA DA OPERAÇÃO</div>
              <div className="font-bold">{natureza}</div>
            </div>
            <div className="col-span-3 p-1">
              <div className="text-[7px]">INSCRIÇÃO ESTADUAL</div>
              <div className="font-bold">{formatIe(emit?.IE)}</div>
            </div>
          </div>
          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-9 border-r border-black p-1">
              <div className="text-[7px]">INSCRIÇÃO ESTADUAL DO SUBST. TRIB.</div>
              <div className="font-bold">{safe(emit?.IEST)}</div>
            </div>
            <div className="col-span-3 p-1">
              <div className="text-[7px]">CNPJ / CPF</div>
              <div className="font-bold">{formatCpfCnpj(emit?.CNPJ || emit?.CPF)}</div>
            </div>
          </div>
        </div>

        {/* Destinatário */}
        <div className="border border-black border-t-0">
          <div className="p-1 font-bold">DESTINATÁRIO / REMETENTE</div>
          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-8 border-r border-black p-1">
              <div className="text-[7px]">NOME / RAZÃO SOCIAL</div>
              <div className="font-bold">{safe(dest?.xNome)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">CNPJ / CPF</div>
              <div className="font-bold">{formatCpfCnpj(dest?.CNPJ || dest?.CPF)}</div>
            </div>
            <div className="col-span-2 p-1">
              <div className="text-[7px]">DATA DA EMISSÃO</div>
              <div className="font-bold">{formatDate(dhEmi)}</div>
            </div>
          </div>

          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-8 border-r border-black p-1">
              <div className="text-[7px]">ENDEREÇO</div>
              <div className="font-bold">
                {safe(dest?.enderDest?.xLgr)} {safe(dest?.enderDest?.nro)} {safe(dest?.enderDest?.xCpl)}
              </div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">BAIRRO / DISTRITO</div>
              <div className="font-bold">{safe(dest?.enderDest?.xBairro)}</div>
            </div>
            <div className="col-span-2 p-1">
              <div className="text-[7px]">DATA SAÍDA / ENTRADA</div>
              <div className="font-bold">{formatDate(dhSaiEnt)}</div>
            </div>
          </div>

          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-6 border-r border-black p-1">
              <div className="text-[7px]">MUNICÍPIO</div>
              <div className="font-bold">{safe(dest?.enderDest?.xMun)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">FONE / FAX</div>
              <div className="font-bold">{safe(dest?.enderDest?.fone)}</div>
            </div>
            <div className="col-span-1 border-r border-black p-1">
              <div className="text-[7px]">UF</div>
              <div className="font-bold">{safe(dest?.enderDest?.UF)}</div>
            </div>
            <div className="col-span-3 p-1">
              <div className="text-[7px]">INSCRIÇÃO ESTADUAL</div>
              <div className="font-bold">{formatIe(dest?.IE)}</div>
            </div>
          </div>
        </div>

        {/* Cálculo do imposto */}
        <div className="border border-black border-t-0">
          <div className="p-1 font-bold">CÁLCULO DO IMPOSTO</div>
          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">BASE DE CÁLC. DO ICMS</div>
              <div className="font-bold">{formatNumber(vBCNum)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">VALOR DO ICMS</div>
              <div className="font-bold">{formatNumber(vICMSNum)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">BASE CÁLC. ICMS ST</div>
              <div className="font-bold">{formatNumber(vBCSTNum)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">VALOR ICMS ST</div>
              <div className="font-bold">{formatNumber(vSTNum)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">VALOR TOTAL DOS PRODUTOS</div>
              <div className="font-bold">{formatNumber(vProdNum)}</div>
            </div>
            <div className="col-span-2 p-1">
              <div className="text-[7px]">VALOR DO IPI</div>
              <div className="font-bold">{formatNumber(vIPINum)}</div>
            </div>
          </div>

          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">VALOR DO FRETE</div>
              <div className="font-bold">{formatNumber(totais.vFrete)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">VALOR DO SEGURO</div>
              <div className="font-bold">{formatNumber(totais.vSeg)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">DESCONTO</div>
              <div className="font-bold">{formatNumber(totais.vDesc)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">OUTRAS DESP. ACESS.</div>
              <div className="font-bold">{formatNumber(totais.vOutro)}</div>
            </div>
            <div className="col-span-4 p-1 text-right">
              <div className="text-[7px]">VALOR TOTAL DA NOTA</div>
              <div className="font-bold text-[11px]">{formatNumber(vNFNum)}</div>
            </div>
          </div>
        </div>

        {/* Transporte */}
        <div className="border border-black border-t-0">
          <div className="p-1 font-bold">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-4 border-r border-black p-1">
              <div className="text-[7px]">RAZÃO SOCIAL</div>
              <div className="font-bold">{safe(transp?.xNome)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">FRETE POR CONTA</div>
              <div className="font-bold">{safe(transp?.modFrete)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">PLACA DO VEÍCULO</div>
              <div className="font-bold">{safe(transp?.veicTransp?.placa)}</div>
            </div>
            <div className="col-span-1 border-r border-black p-1">
              <div className="text-[7px]">UF</div>
              <div className="font-bold">{safe(transp?.veicTransp?.UF)}</div>
            </div>
            <div className="col-span-3 p-1">
              <div className="text-[7px]">CNPJ / CPF</div>
              <div className="font-bold">{formatCpfCnpj(transp?.CNPJ || transp?.CPF)}</div>
            </div>
          </div>

          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-6 border-r border-black p-1">
              <div className="text-[7px]">ENDEREÇO</div>
              <div className="font-bold">{safe(transp?.xEnder)}</div>
            </div>
            <div className="col-span-4 border-r border-black p-1">
              <div className="text-[7px]">MUNICÍPIO</div>
              <div className="font-bold">{safe(transp?.xMun)}</div>
            </div>
            <div className="col-span-2 p-1">
              <div className="text-[7px]">INSCRIÇÃO ESTADUAL</div>
              <div className="font-bold">{formatIe(transp?.IE)}</div>
            </div>
          </div>

          <div className="grid grid-cols-12 border-t border-black">
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">QUANTIDADE</div>
              <div className="font-bold">{safe(vol?.qVol || danfe?.qVol)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">ESPÉCIE</div>
              <div className="font-bold">{safe(vol?.esp || danfe?.esp)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">MARCA</div>
              <div className="font-bold">{safe(vol?.marca || danfe?.marca)}</div>
            </div>
            <div className="col-span-2 border-r border-black p-1">
              <div className="text-[7px]">NUMERAÇÃO</div>
              <div className="font-bold">{safe(vol?.nVol || danfe?.nVol)}</div>
            </div>
            <div className="col-span-4 p-1">
              <div className="text-[7px]">PESO BRUTO (KG)</div>
              <div className="font-bold">{safe(vol?.pesoB || danfe?.pesoB)}</div>
            </div>
          </div>
        </div>

        {/* Itens + Espaçador elástico + Informações adicionais */}
        <div className="border border-black border-t-0 flex flex-col" style={{ flex: "1 1 auto", minHeight: 0 }}>
          <div className="p-1 font-bold">DADOS DO PRODUTO / SERVIÇOS</div>

          <div className="border-t border-black">
            <table className="w-full border-collapse text-[7px]">
              <thead>
                <tr className="border-b border-black">
                  <th className="border-r border-black p-1 text-left w-[24px]">CÓD</th>
                  <th className="border-r border-black p-1 text-left">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                  <th className="border-r border-black p-1 text-center w-[58px]">NCM/SH</th>
                  <th className="border-r border-black p-1 text-center w-[36px]">CFOP</th>
                  <th className="border-r border-black p-1 text-center w-[22px]">UN</th>
                  <th className="border-r border-black p-1 text-right w-[40px]">QTD.</th>
                  <th className="border-r border-black p-1 text-right w-[48px]">V. UNIT.</th>
                  <th className="border-r border-black p-1 text-right w-[52px]">V. TOTAL</th>
                  <th className="border-r border-black p-1 text-right w-[40px]">DESC.</th>
                  <th className="border-r border-black p-1 text-right w-[46px]">B.C. ICMS</th>
                  <th className="border-r border-black p-1 text-right w-[36px]">V. ICMS</th>
                  <th className="p-1 text-right w-[36px]">V. IPI</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, idx) => (
                  <tr key={idx} className="border-b border-black">
                    <td className="border-r border-black p-1">{safe(it?.cProd)}</td>
                    <td className="border-r border-black p-1">{safe(it?.xProd)}</td>
                    <td className="border-r border-black p-1 text-center">{safe(it?.NCM)}</td>
                    <td className="border-r border-black p-1 text-center">{safe(it?.CFOP)}</td>
                    <td className="border-r border-black p-1 text-center">{safe(it?.uCom)}</td>
                    <td className="border-r border-black p-1 text-right">{formatNumber(Number(it?.qCom) || 0)}</td>
                    <td className="border-r border-black p-1 text-right">{formatNumber(Number(it?.vUnCom) || 0)}</td>
                    <td className="border-r border-black p-1 text-right">{formatNumber(Number(it?.vProd) || 0)}</td>
                    <td className="border-r border-black p-1 text-right">{formatNumber(Number(it?.vDesc) || 0)}</td>
                    <td className="border-r border-black p-1 text-right">{formatNumber(Number(it?.vBC) || 0)}</td>
                    <td className="border-r border-black p-1 text-right">{formatNumber(Number(it?.vICMS) || 0)}</td>
                    <td className="p-1 text-right">{formatNumber(Number(it?.vIPI) || 0)}</td>
                  </tr>
                ))}
                {/* Se não tiver itens, mantém uma linha “vazia” pra layout não quebrar */}
                {itens.length === 0 && (
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="border-r border-black p-1">&nbsp;</td>
                    <td className="p-1">&nbsp;</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Espaço elástico: se tiver poucos itens, ele cresce e empurra "Dados Adicionais" para o rodapé */}
          <div className="danfe-spacer" />

          <div className="border-t border-black">
            <div className="p-1 font-bold">DADOS ADICIONAIS</div>
            <div className="grid grid-cols-12 border-t border-black">
              <div className="col-span-8 border-r border-black p-1 text-[7px] leading-tight">
                <div className="font-bold mb-1">INFORMAÇÕES COMPLEMENTARES</div>
                <div className="whitespace-pre-wrap">{infoComp}</div>
              </div>
              <div className="col-span-4 p-1 text-[7px] leading-tight">
                <div className="font-bold mb-1">RESERVADO AO FISCO</div>
                <div className="whitespace-pre-wrap">{reservadoFisco}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé pequeno (opcional) */}
        <div className="mt-2 flex justify-between text-[8px] text-gray-600">
          <div className="truncate max-w-[140mm]">{publicUrl || ""}</div>
          <div className="text-right">
            <div>{generatedAt ? formatDate(generatedAt) : ""}</div>
            <div>
              Página {pageNumber} de {totalPages}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
