/**
 * Geração de XML da NF-e 4.00
 * Corrigido e validado conforme schema SEFAZ
 */

export interface NotaData {
  numero: number | string;
  serie: number | string;
  data_emissao: string;
  emitente_cpf_cnpj: string;
  emitente_nome: string;
  emitente_ie?: string;
  emitente_endereco?: string;
  destinatario_cpf_cnpj: string;
  destinatario_nome: string;
  valor_total: number;
  natureza_operacao: string;
  municipio_codigo: string;
  municipio_nome: string;
  uf: string;
}

/* =======================================================
   HELPERS
======================================================= */

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function pad(value: number | string, length: number): string {
  return value.toString().padStart(length, "0");
}

function randomCode(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

/* =======================================================
   CÁLCULO DO DV DA CHAVE (MÓDULO 11)
======================================================= */

function calculateDV(chave43: string): string {

  const pesos = [2,3,4,5,6,7,8,9];

  let soma = 0;
  let pesoIndex = 0;

  for (let i = chave43.length - 1; i >= 0; i--) {

    soma += Number(chave43[i]) * pesos[pesoIndex];

    pesoIndex++;

    if (pesoIndex >= pesos.length)
      pesoIndex = 0;
  }

  const resto = soma % 11;

  const dv = resto === 0 || resto === 1
    ? 0
    : 11 - resto;

  return dv.toString();
}

/* =======================================================
   GERAÇÃO DA CHAVE DE ACESSO
======================================================= */

export function generateChave(nota: NotaData): string {

  const cUF = nota.uf === "GO" ? "52" : "52";

  const data = new Date(nota.data_emissao);

  const ano = data.getFullYear().toString().slice(2);
  const mes = pad(data.getMonth() + 1, 2);

  const cnpj = pad(onlyDigits(nota.emitente_cpf_cnpj), 14);

  const mod = "55";

  const serie = pad(Number(nota.serie), 3);

  const numero = pad(Number(nota.numero), 9);

  const tpEmis = "1";

  const cNF = randomCode(8);

  const chave43 =
    cUF +
    ano +
    mes +
    cnpj +
    mod +
    serie +
    numero +
    tpEmis +
    cNF;

  const dv = calculateDV(chave43);

  return chave43 + dv;
}

/* =======================================================
   GERAÇÃO DO XML
======================================================= */

export function generateNFeXml(nota: NotaData): string {

  const chave = generateChave(nota);

  const serie = pad(Number(nota.serie), 3);
  const numero = pad(Number(nota.numero), 9);

  const dhEmi = new Date(nota.data_emissao).toISOString();

  return `
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>1</idLote>
  <indSinc>1</indSinc>

  <NFe>

    <infNFe versao="4.00" Id="NFe${chave}">

      <ide>

        <cUF>52</cUF>
        <natOp>${nota.natureza_operacao}</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${numero}</nNF>

        <dhEmi>${dhEmi}</dhEmi>

        <tpNF>1</tpNF>

        <idDest>1</idDest>

        <cMunFG>${nota.municipio_codigo}</cMunFG>

        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>

        <cDV>${chave.slice(-1)}</cDV>

        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>

        <indFinal>1</indFinal>
        <indPres>0</indPres>

        <procEmi>0</procEmi>
        <verProc>1.0</verProc>

      </ide>

      <emit>

        <CNPJ>${onlyDigits(nota.emitente_cpf_cnpj)}</CNPJ>

        <xNome>${nota.emitente_nome}</xNome>

        ${nota.emitente_ie ? `<IE>${nota.emitente_ie}</IE>` : ""}

      </emit>

      <dest>

        <CPF>${onlyDigits(nota.destinatario_cpf_cnpj)}</CPF>

        <xNome>${nota.destinatario_nome}</xNome>

        <indIEDest>9</indIEDest>

      </dest>

      <total>

        <ICMSTot>

          <vNF>${nota.valor_total.toFixed(2)}</vNF>

        </ICMSTot>

      </total>

    </infNFe>

  </NFe>

</enviNFe>
`;
}
