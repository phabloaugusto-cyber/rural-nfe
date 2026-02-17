/**
 * Geração do XML da NF-e 4.00
 * Versão revisada com validações rígidas para evitar erro 225 (Schema)
 */

interface NotaInput {
  chave_acesso: string
  numero: number
  serie: number
  data_emissao: string
  natureza_operacao: string
  emitente: any
  destinatario: any
  itens: any[]
  valor_total: number
}

function onlyNumbers(value: string) {
  return value?.replace(/\D/g, "") || ""
}

function validarUF(uf: string) {
  const UFS = [
    "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
    "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR",
    "SC","SP","SE","TO"
  ]
  return UFS.includes((uf || "").toUpperCase())
}

function normalizarSerie(serie: number) {
  const s = Number(serie)
  if (isNaN(s) || s < 1) return 1
  if (s > 999) return 999
  return s
}

function validarChaveAcesso(chave: string) {
  const limpa = onlyNumbers(chave)
  if (limpa.length !== 44) {
    throw new Error("Chave de acesso inválida. Deve conter 44 dígitos.")
  }
  return limpa
}

export function generateNFeXml(nota: NotaInput) {

  const chave = validarChaveAcesso(nota.chave_acesso)
  const serie = normalizarSerie(nota.serie)

  const emitUF = nota.emitente.uf?.toUpperCase()
  const destUFOriginal = nota.destinatario.uf?.toUpperCase()

  if (!validarUF(emitUF)) {
    throw new Error("UF do emitente inválida.")
  }

  const destUF = validarUF(destUFOriginal)
    ? destUFOriginal
    : emitUF

  const emitCNPJ = onlyNumbers(nota.emitente.cnpj)
  const destCNPJ = onlyNumbers(nota.destinatario.cnpj || "")
  const destCPF = onlyNumbers(nota.destinatario.cpf || "")

  if (!emitCNPJ || emitCNPJ.length !== 14) {
    throw new Error("CNPJ do emitente inválido.")
  }

  const dataISO = new Date(nota.data_emissao).toISOString()

  const itensXml = nota.itens.map((item, index) => {

    const quantidade = Number(item.quantidade).toFixed(4)
    const valorUnit = Number(item.valor_unitario).toFixed(4)
    const valorTotal = Number(item.valor_total).toFixed(2)

    return `
      <det nItem="${index + 1}">
        <prod>
          <cProd>${item.codigo}</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>${item.descricao}</xProd>
          <NCM>${item.ncm}</NCM>
          <CFOP>${item.cfop}</CFOP>
          <uCom>${item.unidade}</uCom>
          <qCom>${quantidade}</qCom>
          <vUnCom>${valorUnit}</vUnCom>
          <vProd>${valorTotal}</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>${item.unidade}</uTrib>
          <qTrib>${quantidade}</qTrib>
          <vUnTrib>${valorUnit}</vUnTrib>
          <indTot>1</indTot>
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
    `
  }).join("")

  const xml = `
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>${Date.now()}</idLote>
  <indSinc>1</indSinc>
  <NFe>
    <infNFe versao="4.00" Id="NFe${chave}">
      <ide>
        <cUF>${nota.emitente.cuf}</cUF>
        <natOp>${nota.natureza_operacao}</natOp>
        <mod>55</mod>
        <serie>${serie}</serie>
        <nNF>${nota.numero}</nNF>
        <dhEmi>${dataISO}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>${nota.emitente.codigo_municipio}</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>${chave[43]}</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
        <procEmi>0</procEmi>
        <verProc>1.0</verProc>
      </ide>

      <emit>
        <CNPJ>${emitCNPJ}</CNPJ>
        <xNome>${nota.emitente.razao_social}</xNome>
        <enderEmit>
          <xLgr>${nota.emitente.logradouro}</xLgr>
          <nro>${nota.emitente.numero}</nro>
          <xBairro>${nota.emitente.bairro}</xBairro>
          <cMun>${nota.emitente.codigo_municipio}</cMun>
          <xMun>${nota.emitente.municipio}</xMun>
          <UF>${emitUF}</UF>
          <CEP>${onlyNumbers(nota.emitente.cep)}</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
        </enderEmit>
        <IE>${nota.emitente.ie}</IE>
        <CRT>1</CRT>
      </emit>

      <dest>
        ${destCNPJ ? `<CNPJ>${destCNPJ}</CNPJ>` : `<CPF>${destCPF}</CPF>`}
        <xNome>${nota.destinatario.nome}</xNome>
        <enderDest>
          <xLgr>${nota.destinatario.logradouro}</xLgr>
          <nro>${nota.destinatario.numero}</nro>
          <xBairro>${nota.destinatario.bairro}</xBairro>
          <cMun>${nota.destinatario.codigo_municipio}</cMun>
          <xMun>${nota.destinatario.municipio}</xMun>
          <UF>${destUF}</UF>
          <CEP>${onlyNumbers(nota.destinatario.cep)}</CEP>
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
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>${Number(nota.valor_total).toFixed(2)}</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${Number(nota.valor_total).toFixed(2)}</vNF>
        </ICMSTot>
      </total>

      <transp>
        <modFrete>9</modFrete>
      </transp>

    </infNFe>
  </NFe>
</enviNFe>
  `.trim()

  return xml
}
