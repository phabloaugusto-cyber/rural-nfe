/**
 * Geração de XML NF-e 4.00
 * Compatível com transmissão via proxy mTLS
 * Corrigido cálculo do DV da chave de acesso
 */

export interface NotaItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  cfop: string;
  ncm: string;
  unidade: string;
}

export interface NotaData {
  numero: number;
  serie: number;
  data_emissao: string;
  natureza_operacao: string;

  emitente_nome: string;
  emitente_cpf_cnpj: string;
  emitente_ie: string;
  emitente_municipio: string;
  emitente_uf: string;

  destinatario_nome: string;
  destinatario_cpf_cnpj: string;
  destinatario_municipio: string;
  destinatario_uf: string;

  itens: NotaItem[];
}

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function pad(num: number | string, size: number): string {
  return num.toString().padStart(size, "0");
}

function randomCode(size: number): string {
  let result = "";
  for (let i = 0; i < size; i++)
    result += Math.floor(Math.random() * 10);
  return result;
}

/* ========================================================= */
/* CÁLCULO DV CORRETO */
/* ========================================================= */

function calculateDV(chave43: string): string {

  const pesos = [2,3,4,5,6,7,8,9];

  let soma = 0;
  let pesoIndex = 0;

  for (let i = chave43.length - 1; i >= 0; i--) {

    soma += parseInt(chave43[i]) * pesos[pesoIndex];

    pesoIndex++;
    if (pesoIndex === pesos.length)
      pesoIndex = 0;
  }

  const resto = soma % 11;

  const dv =
    resto === 0 || resto === 1
      ? 0
      : 11 - resto;

  return dv.toString();
}

/* ========================================================= */
/* GERAÇÃO CHAVE ACESSO */
/* ========================================================= */

function generateChave(nota: NotaData): string {

  const cUF = "52";

  const data = new Date(nota.data_emissao);

  const ano = data.getFullYear().toString().slice(2);
  const mes = pad(data.getMonth() + 1, 2);

  const cnpj = pad(onlyDigits(nota.emitente_cpf_cnpj), 14);

  const mod = "55";

  const serie = pad(nota.serie, 3);

  const numero = pad(nota.numero, 9);

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

/* ========================================================= */
/* GERAÇÃO XML */
/* ========================================================= */

export function generateNFeXml(nota: NotaData): string {

  const chave = generateChave(nota);

  const dhEmi = new Date(nota.data_emissao)
    .toISOString()
    .replace("Z", "-03:00");

  const cNF = chave.substring(35, 43);

  let itensXml = "";
  let total = 0;

  nota.itens.forEach((item, index) => {

    const valorTotal = item.quantidade * item.valor_unitario;

    total += valorTotal;

    itensXml += `
      <det nItem="${index + 1}">
        <prod>
          <cProd>${index + 1}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${item.descricao}</xProd>
          <NCM>${item.ncm}</NCM>
          <CFOP>${item.cfop}</CFOP>
          <uCom>${item.unidade}</uCom>
          <qCom>${item.quantidade.toFixed(4)}</qCom>
          <vUnCom>${item.valor_unitario.toFixed(4)}</vUnCom>
          <vProd>${valorTotal.toFixed(2)}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${item.unidade}</uTrib>
          <qTrib>${item.quantidade.toFixed(4)}</qTrib>
          <vUnTrib>${item.valor_unitario.toFixed(4)}</vUnTrib>
        </prod>

        <imposto>
          <ICMS>
            <ICMSSN102>
              <orig>0</orig>
              <CSOSN>102</CSOSN>
            </ICMSSN102>
          </ICMS>

          <PIS>
            <PISOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pPIS>0.00</pPIS>
              <vPIS>0.00</vPIS>
            </PISOutr>
          </PIS>

          <COFINS>
            <COFINSOutr>
              <CST>99</CST>
              <vBC>0.00</vBC>
              <pCOFINS>0.00</pCOFINS>
              <vCOFINS>0.00</vCOFINS>
            </COFINSOutr>
          </COFINS>

        </imposto>

      </det>
    `;
  });

  const xml = `
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">

  <idLote>${Date.now()}</idLote>
  <indSinc>1</indSinc>

  <NFe>

    <infNFe versao="4.00" Id="NFe${chave}">

      <ide>

        <cUF>52</cUF>
        <cNF>${cNF}</cNF>
        <natOp>${nota.natureza_operacao}</natOp>
        <mod>55</mod>
        <serie>${nota.serie}</serie>
        <nNF>${nota.numero}</nNF>

        <dhEmi>${dhEmi}</dhEmi>

        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>5204300</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave.slice(-1)}</cDV>

        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>RuralNFe</verProc>

      </ide>

      <emit>

        <CNPJ>${onlyDigits(nota.emitente_cpf_cnpj)}</CNPJ>
        <xNome>${nota.emitente_nome}</xNome>

        <enderEmit>
          <xMun>${nota.emitente_municipio}</xMun>
          <UF>${nota.emitente_uf}</UF>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>

        <IE>${nota.emitente_ie}</IE>
        <CRT>1</CRT>

      </emit>

      <dest>

        <CPF>${onlyDigits(nota.destinatario_cpf_cnpj)}</CPF>
        <xNome>${nota.destinatario_nome}</xNome>

        <enderDest>
          <xMun>${nota.destinatario_municipio}</xMun>
          <UF>${nota.destinatario_uf}</UF>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderDest>

        <indIEDest>9</indIEDest>

      </dest>

      ${itensXml}

      <total>

        <ICMSTot>

          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>

          <vProd>${total.toFixed(2)}</vProd>

          <vNF>${total.toFixed(2)}</vNF>

        </ICMSTot>

      </total>

    </infNFe>

  </NFe>

</enviNFe>
`;

  return xml.trim();
}
