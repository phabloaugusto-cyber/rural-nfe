import Barcode from "react-barcode";
import { NFeItem } from "@/types/nfe";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

interface DanfePreviewProps {
  numero?: string;
  serie?: string;
  dataEmissao?: string;
  naturezaOperacao?: string;
  cfop?: string;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
  status?: string;
  tpNF?: string;
  dataSaida?: string;
  onDataSaidaChange?: (value: string) => void;
  emitente?: {
    razaoSocial: string;
    cnpj: string;
    ie: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  destinatario?: {
    nome: string;
    cpfCnpj: string;
    ie: string;
    propriedade: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  itens?: NFeItem[];
  valorTotal?: number;
  informacoesAdicionais?: string;
  transportador?: {
    nome: string;
    placa: string;
    uf: string;
    cpfCnpj?: string;
    rntrc?: string;
  };
}

const Cell = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={`border border-black px-1 py-0.5 ${className}`}>
    <p className="text-[6px] uppercase text-gray-500 leading-none">{label}</p>
    <p className="text-[9px] font-medium text-black leading-tight mt-0.5">{value || "—"}</p>
  </div>
);

const SectionHeader = ({ children }: { children: string }) => (
  <div className="border border-black bg-gray-100 px-1 py-0.5">
    <p className="text-[7px] font-bold uppercase text-black">{children}</p>
  </div>
);

const DanfePreview = ({
  numero = "000.001.234",
  serie = "1",
  dataEmissao = new Date().toLocaleDateString("pt-BR"),
  naturezaOperacao = "SIMPLES REMESSA",
  cfop = "5.923",
  chaveAcesso,
  protocoloAutorizacao,
  status,
  dataSaida,
  onDataSaidaChange,
  tpNF,
  emitente = {
    razaoSocial: "LEILÃO X LTDA",
    cnpj: "00.000.000/0001-00",
    ie: "000.000.000",
    endereco: "Rua Exemplo, 123 - Centro",
    cidade: "Goiânia",
    uf: "GO",
    cep: "74000-000",
  },
  destinatario = {
    nome: "JOSÉ ANTÔNIO DA SILVA",
    cpfCnpj: "123.456.789-00",
    ie: "123.456.789",
    propriedade: "Fazenda Boa Vista",
    endereco: "Zona Rural",
    cidade: "Ribeirão Preto",
    uf: "SP",
    cep: "14000-000",
  },
  itens = [
    { id: "1", descricao: "BOVINO P/ ABATE, MACHO, CASTRADO, 13-24 MESES", ncm: "0102.29.90", quantidade: 15, valorUnitario: 2051.89, valorTotal: 30778.35, lote: "01", raca: "Nelore", peso: 450, codigoSefaz: "961" },
  ],
  valorTotal,
  informacoesAdicionais = "",
  transportador,
}: DanfePreviewProps) => {
  const total = valorTotal ?? itens.reduce((s, i) => s + i.valorTotal, 0);
  const isCancelada = status === "cancelada";
  const isEntrada = tpNF === "0" || (cfop && cfop.replace(/\D/g, "").startsWith("1"));
  const tipoOperacao = isEntrada ? "0" : "1";
  const serieFormatada = serie.padStart(3, "0");
  const totalQtd = itens.reduce((s, i) => s + i.quantidade, 0);
  const totalPeso = itens.reduce((s, i) => s + (i.peso || 0) * i.quantidade, 0);

  return (
    <div className="mx-auto bg-white text-black font-sans print:shadow-none relative danfe-root" style={{ width: "210mm", padding: "6mm", boxSizing: "border-box", fontSize: "9px" }}>
      {isCancelada && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ overflow: "hidden" }}>
          <p className="text-red-500 font-bold opacity-30 select-none" style={{ fontSize: "100px", transform: "rotate(-45deg)", whiteSpace: "nowrap", letterSpacing: "20px" }}>
            CANCELADA
          </p>
        </div>
      )}

      {/* ===== CANHOTO (Recibo) ===== */}
      <div data-pdf-section className="border border-black mb-1">
        <div className="grid grid-cols-[1fr_auto]">
          <div className="border-r border-black p-1">
            <p className="text-[7px] text-gray-500 leading-tight">
              RECEBEMOS DE <span className="font-bold text-black">{emitente.razaoSocial}</span> OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO. DEST.: <span className="font-bold text-black">{destinatario.nome}</span> - VALOR TOTAL: <span className="font-bold text-black">{formatCurrency(total)}</span>
            </p>
            <div className="grid grid-cols-2 mt-1 gap-0">
              <Cell label="Data de Recebimento" value="" />
              <Cell label="Identificação e Assinatura do Recebedor" value="" />
            </div>
          </div>
          <div className="p-1 text-center min-w-[80px] flex flex-col justify-center">
            <p className="text-[10px] font-bold">NF-e</p>
            <p className="text-[9px] font-bold">Nº {numero}</p>
            <p className="text-[8px]">SÉRIE {serieFormatada}</p>
          </div>
        </div>
      </div>

      {/* ===== CABEÇALHO PRINCIPAL ===== */}
      <div data-pdf-section className="border border-black">
        <SectionHeader>IDENTIFICAÇÃO DO EMITENTE</SectionHeader>

        <div className="grid grid-cols-[1fr_auto_1fr]">
          {/* Emitente */}
          <div className="border-r border-black p-2">
            <p className="text-[12px] font-bold leading-tight">{emitente.razaoSocial}</p>
            <p className="text-[8px] mt-1">{emitente.endereco}</p>
            <p className="text-[8px]">{emitente.cidade} - {emitente.uf} CEP: {emitente.cep}</p>
          </div>
          {/* DANFE box */}
          <div className="border-r border-black p-2 text-center flex flex-col justify-center items-center min-w-[110px]">
            <p className="text-[14px] font-bold">DANFE</p>
            <p className="text-[6px] leading-tight mt-0.5">DOCUMENTO AUXILIAR DA<br/>NOTA FISCAL ELETRÔNICA</p>
            <div className="mt-1 flex gap-2 text-[7px] items-center">
              <span className={isEntrada ? "font-bold" : ""}>0 - ENTRADA</span>
              <span className={!isEntrada ? "font-bold" : ""}>1 - SAÍDA</span>
            </div>
            <div className="mt-1 border border-black w-5 h-5 flex items-center justify-center text-[10px] font-bold mx-auto">{tipoOperacao}</div>
            <p className="text-[8px] mt-1 font-bold">Nº {numero}&nbsp;&nbsp;fl. 1/1</p>
            <p className="text-[8px]">SÉRIE {serieFormatada}</p>
          </div>
          {/* Chave / Protocolo */}
          <div className="p-2 flex flex-col justify-between">
            {chaveAcesso && (
              <div className="mb-1 flex justify-center">
                <Barcode value={chaveAcesso.replace(/\D/g, "")} format="CODE128" width={0.9} height={28} displayValue={false} margin={0} />
              </div>
            )}
            <div className="border border-black p-1 mb-1 text-center">
              <p className="text-[6px] text-gray-500">CHAVE DE ACESSO</p>
              <p className="text-[7px] font-mono tracking-wider leading-tight">{chaveAcesso || "— sem chave —"}</p>
            </div>
            <p className="text-[6px] text-center text-gray-500 leading-tight">Consulta de autenticidade no portal nacional da NF-e<br/>www.nfe.fazenda.gov.br/portal</p>
            <div className="border border-black p-1 text-center mt-1">
              <p className="text-[6px] text-gray-500">PROTOCOLO DE AUTORIZAÇÃO DE USO</p>
              <p className="text-[7px]">{protocoloAutorizacao || "—"}</p>
            </div>
          </div>
        </div>

        {/* Natureza / IE / IE Subst */}
        <div className="grid grid-cols-[2fr_1fr]">
          <Cell label="Natureza da Operação" value={naturezaOperacao} />
          <Cell label="Inscrição Estadual" value={emitente.ie} />
        </div>
        <div className="grid grid-cols-2">
          <Cell label="Inscrição Estadual do Subst. Trib." value="" />
          <Cell label="CNPJ / CPF" value={emitente.cnpj} />
        </div>

        {/* ===== DESTINATÁRIO ===== */}
        <SectionHeader>DESTINATÁRIO / REMETENTE</SectionHeader>
        <div className="grid grid-cols-[2fr_1fr_auto]">
          <Cell label="Nome / Razão Social" value={destinatario.nome} />
          <Cell label="CNPJ / CPF" value={destinatario.cpfCnpj} />
          <Cell label="Data da Emissão" value={dataEmissao} className="min-w-[80px]" />
        </div>
        <div className="grid grid-cols-[2fr_1fr_1fr_auto]">
          <Cell label="Endereço" value={destinatario.propriedade ? `${destinatario.propriedade}, ${destinatario.endereco}` : destinatario.endereco} />
          <Cell label="Bairro / Distrito" value="Zona Rural" />
          <Cell label="CEP" value={destinatario.cep} />
          {onDataSaidaChange ? (
            <div className="border border-black px-1 py-0.5 min-w-[80px]">
              <p className="text-[6px] uppercase text-gray-500 leading-none">Data Saída / Entrada</p>
              <input
                type="text"
                value={dataSaida || dataEmissao}
                onChange={(e) => onDataSaidaChange(e.target.value)}
                className="text-[9px] font-medium text-black leading-tight mt-0.5 w-full bg-transparent border-none outline-none p-0 print:appearance-none"
              />
            </div>
          ) : (
            <Cell label="Data Saída / Entrada" value={dataSaida || dataEmissao} className="min-w-[80px]" />
          )}
        </div>
        <div className="grid grid-cols-[2fr_1fr_auto_auto]">
          <Cell label="Município" value={destinatario.cidade} />
          <Cell label="Fone / Fax" value="" />
          <Cell label="UF" value={destinatario.uf} className="min-w-[30px]" />
          <Cell label="Inscrição Estadual" value={destinatario.ie} className="min-w-[100px]" />
        </div>

        {/* ===== CÁLCULO DO IMPOSTO ===== */}
        <SectionHeader>CÁLCULO DO IMPOSTO</SectionHeader>
        <div className="grid grid-cols-5">
          <Cell label="Base de Cálculo do ICMS" value="0,00" />
          <Cell label="Valor do ICMS" value="0,00" />
          <Cell label="Base Cálc. ICMS Subst." value="0,00" />
          <Cell label="Valor do ICMS Subst." value="0,00" />
          <Cell label="Valor Total dos Produtos" value={formatNumber(total)} />
        </div>
        <div className="grid grid-cols-5">
          <Cell label="Valor do Frete" value="0,00" />
          <Cell label="Valor do Seguro" value="0,00" />
          <Cell label="Desconto" value="0,00" />
          <Cell label="Outras Desp. Acess." value="0,00" />
          <Cell label="Valor do IPI" value="0,00" />
        </div>
        <div className="grid grid-cols-1">
          <Cell label="Valor Total da Nota" value={formatNumber(total)} className="font-bold text-right" />
        </div>

        {/* ===== TRANSPORTADOR ===== */}
        <SectionHeader>TRANSPORTADOR / VOLUMES TRANSPORTADOS</SectionHeader>
        <div className="grid grid-cols-[2fr_auto_1fr_1fr_auto_1fr]">
          <Cell label="Razão Social" value={transportador?.nome || "—"} />
          <Cell label="Frete por Conta" value={transportador ? (cfop?.startsWith("1") ? "0 - EMITENTE" : "1 - DESTINATÁRIO") : "9 - SEM FRETE"} className="min-w-[80px]" />
          <Cell label="Código ANTT" value={transportador?.rntrc || ""} />
          <Cell label="Placa do Veículo" value={transportador?.placa || "—"} />
          <Cell label="UF" value={transportador?.uf || "—"} className="min-w-[30px]" />
          <Cell label="CNPJ / CPF" value={transportador?.cpfCnpj || "—"} />
        </div>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <Cell label="Endereço" value="" />
          <Cell label="Município" value="" />
          <Cell label="UF" value="" />
          <Cell label="Inscrição Estadual" value="" />
          <Cell label="" value="" />
        </div>
        <div className="grid grid-cols-5">
          <Cell label="Quantidade" value={String(totalQtd)} />
          <Cell label="Espécie" value="BOVINO" />
          <Cell label="Marca" value="" />
          <Cell label="Numeração" value="" />
          <Cell label="Peso Bruto (Kg)" value={totalPeso > 0 ? formatNumber(totalPeso) : ""} />
        </div>

        {/* ===== ITENS (área flex-grow preenche o espaço restante) ===== */}
        <SectionHeader>DADOS DO PRODUTO / SERVIÇOS</SectionHeader>
        <div className="border-l border-r border-b border-black">
          <table className="danfe-items-table w-full border-collapse text-[7px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-0.5 py-0.5 text-left text-[6px]">CÓDIGO</th>
                <th className="border border-black px-0.5 py-0.5 text-left text-[6px]">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                <th className="border border-black px-0.5 py-0.5 text-center text-[6px]">NCM/SH</th>
                <th className="border border-black px-0.5 py-0.5 text-center text-[6px]">CFOP</th>
                <th className="border border-black px-0.5 py-0.5 text-center text-[6px]">UNID</th>
                <th className="border border-black px-0.5 py-0.5 text-right text-[6px]">QUANT.</th>
                <th className="border border-black px-0.5 py-0.5 text-right text-[6px]">V. UNIT.</th>
                <th className="border border-black px-0.5 py-0.5 text-right text-[6px]">V. TOTAL</th>
                <th className="border border-black px-0.5 py-0.5 text-right text-[6px]">DESC.</th>
                <th className="border border-black px-0.5 py-0.5 text-right text-[6px]">B.C. ICMS</th>
                <th className="border border-black px-0.5 py-0.5 text-right text-[6px]">V. ICMS</th>
                <th className="border border-black px-0.5 py-0.5 text-right text-[6px]">V. IPI</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black px-0.5 py-0.5">{item.codigoSefaz}</td>
                  <td className="border border-black px-0.5 py-0.5">{item.descricao}</td>
                  <td className="border border-black px-0.5 py-0.5 text-center">{item.ncm}</td>
                  <td className="border border-black px-0.5 py-0.5 text-center">{cfop.replace(".", "")}</td>
                  <td className="border border-black px-0.5 py-0.5 text-center">UN</td>
                  <td className="border border-black px-0.5 py-0.5 text-right">{formatNumber(item.quantidade)}</td>
                  <td className="border border-black px-0.5 py-0.5 text-right">{formatNumber(item.valorUnitario)}</td>
                  <td className="border border-black px-0.5 py-0.5 text-right">{formatNumber(item.valorTotal)}</td>
                  <td className="border border-black px-0.5 py-0.5 text-right">0,00</td>
                  <td className="border border-black px-0.5 py-0.5 text-right">0,00</td>
                  <td className="border border-black px-0.5 py-0.5 text-right">0,00</td>
                  <td className="border border-black px-0.5 py-0.5 text-right">0,00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Espaçamento entre itens e dados adicionais: 30mm mobile, 50mm desktop */}
        <div className="danfe-spacer">&nbsp;</div>

        {/* ===== DADOS ADICIONAIS ===== */}
        <SectionHeader>DADOS ADICIONAIS</SectionHeader>
        <div className="grid grid-cols-2">
          <div className="border border-black">
            <p className="text-[6px] uppercase text-gray-500 px-1 pt-0.5">Informações Complementares</p>
            <div className="p-1 min-h-[50px]">
              <pre className="whitespace-pre-wrap text-[7px] leading-snug font-sans">{informacoesAdicionais}</pre>
            </div>
          </div>
          <div className="border border-l-0 border-black">
            <p className="text-[6px] uppercase text-gray-500 px-1 pt-0.5">Reservado ao Fisco</p>
            <div className="p-1 min-h-[50px]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DanfePreview;
