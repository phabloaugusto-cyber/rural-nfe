import { Mercadoria } from "@/types/mercadoria";

export const mockMercadorias: Mercadoria[] = [
  // Bovinos
  { id: "1", codigo: "961", descricao: "Gado bovino genérico até 12 meses", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Cria", valorPauta: 1500 },
  { id: "2", codigo: "962", descricao: "Gado bovino genérico de 13 a 24 meses", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Recria", valorPauta: 2200 },
  { id: "3", codigo: "963", descricao: "Gado bovino genérico acima de 24 meses", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Abate", valorPauta: 3500 },
  { id: "4", codigo: "964", descricao: "Vaca gorda", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Abate", valorPauta: 2800 },
  { id: "5", codigo: "965", descricao: "Boi gordo", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Abate", valorPauta: 3500 },
  { id: "6", codigo: "966", descricao: "Novilha", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Recria", valorPauta: 2500 },
  { id: "7", codigo: "967", descricao: "Garrote", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Recria", valorPauta: 2200 },
  { id: "8", codigo: "968", descricao: "Bezerro(a) desmamado", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Cria", valorPauta: 1800 },
  { id: "9", codigo: "969", descricao: "Touro reprodutor", ncm: "0102.21.00", unidade: "CAB", especie: "bovino", categoria: "Reprodução", valorPauta: 8000 },
  { id: "10", codigo: "970", descricao: "Vaca matriz", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Reprodução", valorPauta: 4500 },
  { id: "11", codigo: "971", descricao: "Vaca prenha", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Reprodução", valorPauta: 5000 },
  { id: "12", codigo: "972", descricao: "Boi magro", ncm: "0102.29.90", unidade: "CAB", especie: "bovino", categoria: "Recria", valorPauta: 2600 },
  // Equinos
  { id: "13", codigo: "980", descricao: "Cavalo adulto", ncm: "0101.29.00", unidade: "CAB", especie: "equino", categoria: "Adulto", valorPauta: 5000 },
  { id: "14", codigo: "981", descricao: "Égua adulta", ncm: "0101.29.00", unidade: "CAB", especie: "equino", categoria: "Adulto", valorPauta: 4000 },
  { id: "15", codigo: "982", descricao: "Potro(a) até 2 anos", ncm: "0101.29.00", unidade: "CAB", especie: "equino", categoria: "Jovem", valorPauta: 3000 },
  { id: "16", codigo: "983", descricao: "Garanhão reprodutor", ncm: "0101.21.00", unidade: "CAB", especie: "equino", categoria: "Reprodução", valorPauta: 15000 },
  { id: "17", codigo: "984", descricao: "Égua prenha", ncm: "0101.29.00", unidade: "CAB", especie: "equino", categoria: "Reprodução", valorPauta: 6000 },
  { id: "18", codigo: "985", descricao: "Muar/Mula", ncm: "0101.30.00", unidade: "CAB", especie: "equino", categoria: "Trabalho", valorPauta: 2500 },
];
