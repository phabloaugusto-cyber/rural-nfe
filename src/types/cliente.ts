export interface InscricaoEstadual {
  id: string;
  numero: string;
  uf: string;
  propriedade: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  inscricoesEstaduais: InscricaoEstadual[];
}
