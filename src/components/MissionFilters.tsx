import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MissionFiltersProps {
  statusFilter: string;
  searchQuery: string;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export default function MissionFilters({
  statusFilter,
  searchQuery,
  onStatusChange,
  onSearchChange,
}: MissionFiltersProps) {
  return (
    <div className="flex gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par titre, référence ou destination..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="draft">Brouillon</SelectItem>
          <SelectItem value="pending">En attente</SelectItem>
          <SelectItem value="approved">Approuvé</SelectItem>
          <SelectItem value="rejected">Rejeté</SelectItem>
          <SelectItem value="paid">Payé</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
