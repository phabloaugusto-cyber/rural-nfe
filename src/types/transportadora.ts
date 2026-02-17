export interface Veiculo {
  id: string;
  placa: string;
  ufPlaca: string;
  rntrc?: string;
}

export interface Transportadora {
  id: string;
  nome: string;
  cpfCnpj: string;
  veiculos: Veiculo[];
}
