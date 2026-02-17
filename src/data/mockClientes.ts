import { Cliente } from "@/types/cliente";

export const mockClientes: Cliente[] = [
  {
    id: "1",
    nome: "José Antônio da Silva",
    cpf: "123.456.789-00",
    inscricoesEstaduais: [
      { id: "1", numero: "123.456.789", uf: "SP", propriedade: "Fazenda Boa Vista", cidade: "Ribeirão Preto", estado: "SP", cep: "14000-000" },
      { id: "2", numero: "987.654.321", uf: "MG", propriedade: "Fazenda São José", cidade: "Uberaba", estado: "MG", cep: "38000-000" },
    ],
  },
  {
    id: "2",
    nome: "Maria Aparecida Oliveira",
    cpf: "987.654.321-00",
    inscricoesEstaduais: [
      { id: "3", numero: "456.789.123", uf: "GO", propriedade: "Fazenda Santa Maria", cidade: "Goiânia", estado: "GO", cep: "74000-000" },
    ],
  },
  {
    id: "3",
    nome: "Carlos Eduardo Pereira",
    cpf: "456.789.123-00",
    inscricoesEstaduais: [
      { id: "4", numero: "321.654.987", uf: "MS", propriedade: "Fazenda Bela Vista", cidade: "Campo Grande", estado: "MS", cep: "79000-000" },
      { id: "5", numero: "654.987.321", uf: "MT", propriedade: "Fazenda Esperança", cidade: "Cuiabá", estado: "MT", cep: "78000-000" },
    ],
  },
];
