export type TipoNota = 'simples_remessa' | 'retorno_origem' | 'nota_entrada';

export const tipoNotaConfig: Record<TipoNota, { label: string; cfop: string }> = {
  simples_remessa: { label: 'Simples Remessa', cfop: '5.923' },
  retorno_origem: { label: 'Retorno à Origem', cfop: '5.918' },
  nota_entrada: { label: 'Nota de Entrada', cfop: '1.914' },
};

export interface NFeItem {
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
}

export interface NFe {
  id: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  tipoNota: TipoNota;
  naturezaOperacao: string;
  status: 'rascunho' | 'emitida' | 'cancelada';
  emitente: {
    razaoSocial: string;
    cpfCnpj: string;
    inscricaoEstadual: string;
    propriedade: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  destinatario: {
    razaoSocial: string;
    cpfCnpj: string;
    inscricaoEstadual: string;
    propriedade: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  itens: NFeItem[];
  valorTotal: number;
  observacoes: string;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
}
