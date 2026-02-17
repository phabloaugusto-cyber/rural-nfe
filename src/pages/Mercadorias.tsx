import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface MercadoriaDB {
  id: string;
  codigo: string;
  descricao: string;
  ncm: string;
  unidade: string;
  especie: string;
  categoria: string;
  valor_pauta: number;
}

const Mercadorias = () => {
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const [mercadorias, setMercadorias] = useState<MercadoriaDB[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMercadorias();
  }, []);

  const fetchMercadorias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mercadorias")
      .select("*")
      .order("categoria")
      .order("descricao");
    if (!error && data) {
      setMercadorias(data);
    }
    setLoading(false);
  };

  const categorias = ["todos", ...Array.from(new Set(mercadorias.map(m => m.categoria)))].sort();

  const filtered = mercadorias.filter((m) => {
    const matchBusca =
      m.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      m.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      m.categoria.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = filtroCategoria === "todos" || m.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

  return (
    <AppLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Mercadorias</h2>
        <p className="text-sm text-muted-foreground">Pauta fiscal de gado bovino (SEFAZ-GO) — {mercadorias.length} itens</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, código ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={filtroCategoria === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroCategoria(cat)}
            >
              {cat === "todos" ? "Todos" : cat}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">NCM</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unidade</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valor Pauta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{m.codigo}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{m.descricao}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.ncm}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.categoria === "Abate" ? "destructive" : m.categoria === "Reprodução" ? "secondary" : "default"}>
                        {m.categoria}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.unidade}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(m.valor_pauta)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma mercadoria encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            {filtered.length} de {mercadorias.length} mercadorias
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Mercadorias;
