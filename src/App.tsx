import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EmitenteProvider } from "@/contexts/EmitenteContext";
import Index from "./pages/Index";
import EmitirNFe from "./pages/EmitirNFe";
import NotasFiscais from "./pages/NotasFiscais";
import Clientes from "./pages/Clientes";
import Mercadorias from "./pages/Mercadorias";
import Transportadoras from "./pages/Transportadoras";
import Configuracoes from "./pages/Configuracoes";
import DanfePage from "./pages/DanfePage";
import Inutilizacoes from "./pages/Inutilizacoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EmitenteProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/emitir" element={<EmitirNFe />} />
            <Route path="/notas" element={<NotasFiscais />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/mercadorias" element={<Mercadorias />} />
            <Route path="/transportadoras" element={<Transportadoras />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/danfe" element={<DanfePage />} />
            <Route path="/inutilizacoes" element={<Inutilizacoes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </EmitenteProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
