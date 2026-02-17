import { useState, useEffect } from "react";
import { LayoutDashboard, FilePlus, FileText, Settings, X, Users, Package, FileSearch, Truck, Building2, ChevronDown, Plus, Ban, Wifi, WifiOff } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEmitente } from "@/contexts/EmitenteContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Início" },
  { to: "/emitir", icon: FilePlus, label: "Emitir NF-e" },
  { to: "/notas", icon: FileText, label: "Notas Fiscais" },
  { to: "/danfe", icon: FileSearch, label: "Prévia DANFE" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/mercadorias", icon: Package, label: "Mercadorias" },
  { to: "/transportadoras", icon: Truck, label: "Transportadoras" },
  { to: "/inutilizacoes", icon: Ban, label: "Inutilização" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AppSidebar = ({ open, onClose }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { emitentes, emitenteAtivo, setEmitenteAtivo } = useEmitente();
  const [proxyOnline, setProxyOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await supabase.functions.invoke("proxy-health");
        setProxyOnline(data?.online ?? false);
      } catch {
        setProxyOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <FileSearch className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground">Rural NFe</h1>
              <p className="text-xs text-sidebar-muted">Sistema de NF-e</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Seletor de Empresa */}
        <div className="px-3 pt-3 pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent">
                <Building2 className="h-4 w-4 shrink-0 text-sidebar-primary" />
                <div className="flex-1 truncate">
                  {emitenteAtivo ? (
                    <>
                      <p className="text-xs font-medium text-sidebar-foreground break-words leading-tight">
                        {emitenteAtivo.razao_social}
                      </p>
                      <p className="truncate text-[10px] text-sidebar-muted">
                        {emitenteAtivo.cpf_cnpj}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-sidebar-muted">Nenhuma empresa</p>
                  )}
                </div>
                <ChevronDown className="h-3 w-3 shrink-0 text-sidebar-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 z-[60]">
              {emitentes.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  Nenhuma empresa cadastrada
                </div>
              )}
              {emitentes.map((e) => (
                <DropdownMenuItem
                  key={e.id}
                  onClick={() => setEmitenteAtivo(e)}
                  className={cn(
                    "flex flex-col items-start gap-0",
                    emitenteAtivo?.id === e.id && "bg-accent"
                  )}
                >
                  <span className="text-sm font-medium">{e.razao_social}</span>
                  <span className="text-[10px] text-muted-foreground">{e.cpf_cnpj}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onClose();
                  navigate("/configuracoes?nova=1");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova empresa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            {proxyOnline === null ? (
              <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
            ) : proxyOnline ? (
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-destructive" />
            )}
            <span className="text-[11px] text-sidebar-muted">
              {proxyOnline === null ? "Verificando proxy..." : proxyOnline ? "Proxy SEFAZ ativo" : "Proxy SEFAZ offline"}
            </span>
          </div>
          <p className="text-xs text-sidebar-muted">v1.0.0 · Rural NFe</p>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
