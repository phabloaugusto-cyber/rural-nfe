import AppLayout from "@/components/AppLayout";
import logoPhablo from "@/assets/logo-phablo.jpeg";

const Index = () => {
  return (
    <AppLayout>
      <div className="flex flex-1 items-center justify-center h-[calc(100vh-2rem)] overflow-hidden">
        <img
          src={logoPhablo}
          alt="Phablo Contabilidade - Leilões e Empresarial"
          className="max-w-full max-h-full w-auto h-auto object-contain"
        />
      </div>
    </AppLayout>
  );
};

export default Index;
