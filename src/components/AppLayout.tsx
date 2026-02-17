import { ReactNode, useState } from "react";
import AppSidebar from "./AppSidebar";
import { Menu, Gavel } from "lucide-react";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Gavel className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">Rural NFe</span>
        </div>
      </header>

      <main className="min-h-screen p-4 lg:ml-64 lg:p-8">{children}</main>
    </div>
  );
};

export default AppLayout;
