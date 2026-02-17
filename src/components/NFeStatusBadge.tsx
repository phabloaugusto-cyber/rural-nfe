import { cn } from "@/lib/utils";

const statusConfig = {
  rascunho: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground",
  },
  emitida: {
    label: "Emitida",
    className: "bg-success/10 text-success",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-destructive/10 text-destructive",
  },
};

const NFeStatusBadge = ({ status }: { status: keyof typeof statusConfig }) => {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
};

export default NFeStatusBadge;
