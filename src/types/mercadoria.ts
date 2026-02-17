export interface Mercadoria {
  id: string;
  codigo: string;
  descricao: string;
  ncm: string;
  unidade: string;
  especie: 'bovino' | 'equino';
  categoria: string;
  valorPauta: number;
}
