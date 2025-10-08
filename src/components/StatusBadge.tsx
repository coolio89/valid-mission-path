import { Badge } from "@/components/ui/badge";

const statusConfig = {
  draft: { label: "Brouillon", className: "bg-status-draft text-foreground" },
  pending_service: { label: "En attente Chef Service", className: "bg-status-pending text-white" },
  pending_director: { label: "En attente Directeur", className: "bg-status-pending text-white" },
  pending_finance: { label: "En attente Finance", className: "bg-status-pending text-white" },
  approved: { label: "Approuvé", className: "bg-status-approved text-white" },
  rejected: { label: "Rejeté", className: "bg-status-rejected text-white" },
  paid: { label: "Payé", className: "bg-status-paid text-white" },
};

export default function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
