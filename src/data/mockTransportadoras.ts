import { Transportadora } from "@/types/transportadora";

export const mockTransportadoras: Transportadora[] = [
  { id: "1", nome: "Transportes Rota do Boi Ltda", cpfCnpj: "12.345.678/0001-99", veiculos: [{ id: "v1", placa: "ABC-1D23", ufPlaca: "GO", rntrc: "12345678" }] },
  { id: "2", nome: "Frete Pecuário Express", cpfCnpj: "98.765.432/0001-11", veiculos: [{ id: "v2", placa: "XYZ-9E87", ufPlaca: "SP", rntrc: "87654321" }] },
  { id: "3", nome: "João Batista - Freteiro", cpfCnpj: "111.222.333-44", veiculos: [{ id: "v3", placa: "DEF-5F67", ufPlaca: "MG" }] },
];
