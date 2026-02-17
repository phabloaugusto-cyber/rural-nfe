import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Emitente {
  id: string;
  razao_social: string;
  cpf_cnpj: string;
  inscricao_estadual: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  serie: string;
  numero_nota_atual: number;
  cert_file_path: string | null;
  cert_file_name: string | null;
  cert_validade: string | null;
  cert_senha: string | null;
}

interface EmitenteContextType {
  emitentes: Emitente[];
  emitenteAtivo: Emitente | null;
  setEmitenteAtivo: (emitente: Emitente) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const EmitenteContext = createContext<EmitenteContextType | undefined>(undefined);

const STORAGE_KEY = "emitente_ativo_id";

export const EmitenteProvider = ({ children }: { children: ReactNode }) => {
  const [emitentes, setEmitentes] = useState<Emitente[]>([]);
  const [emitenteAtivo, setEmitenteAtivoState] = useState<Emitente | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmitentes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("emitentes")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar emitentes:", error);
      setLoading(false);
      return;
    }

    const list = (data || []) as Emitente[];
    setEmitentes(list);

    // Restore active from localStorage
    const savedId = localStorage.getItem(STORAGE_KEY);
    const saved = list.find((e) => e.id === savedId);
    if (saved) {
      setEmitenteAtivoState(saved);
    } else if (list.length > 0) {
      setEmitenteAtivoState(list[0]);
      localStorage.setItem(STORAGE_KEY, list[0].id);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEmitentes();
  }, []);

  const setEmitenteAtivo = (emitente: Emitente) => {
    setEmitenteAtivoState(emitente);
    localStorage.setItem(STORAGE_KEY, emitente.id);
  };

  return (
    <EmitenteContext.Provider
      value={{ emitentes, emitenteAtivo, setEmitenteAtivo, loading, refetch: fetchEmitentes }}
    >
      {children}
    </EmitenteContext.Provider>
  );
};

export const useEmitente = () => {
  const ctx = useContext(EmitenteContext);
  if (!ctx) throw new Error("useEmitente must be used within EmitenteProvider");
  return ctx;
};
