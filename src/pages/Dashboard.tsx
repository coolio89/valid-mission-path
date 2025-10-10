import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import MissionFilters from "@/components/MissionFilters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MissionOrder {
  id: string;
  reference: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const [missions, setMissions] = useState<MissionOrder[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<MissionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchMissions();
    }
  }, [user]);

  useEffect(() => {
    filterMissions();
  }, [missions, statusFilter, searchQuery]);

  const filterMissions = () => {
    let filtered = [...missions];

    // Filter by status
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        filtered = filtered.filter(m =>
          ['pending_service', 'pending_director', 'pending_finance'].includes(m.status)
        );
      } else {
        filtered = filtered.filter(m => m.status === statusFilter);
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.reference.toLowerCase().includes(query) ||
        m.destination.toLowerCase().includes(query)
      );
    }

    setFilteredMissions(filtered);
  };

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("mission_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMissions(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(m => 
        ['pending_service', 'pending_director', 'pending_finance'].includes(m.status)
      ).length || 0;
      const approved = data?.filter(m => 
        ['approved', 'paid'].includes(m.status)
      ).length || 0;
      const rejected = data?.filter(m => m.status === 'rejected').length || 0;
      const totalAmount = data?.reduce((sum, m) => sum + m.estimated_amount, 0) || 0;
      
      setStats({ total, pending, approved, rejected, totalAmount });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground">
              Gérez vos bons de mission et suivez leur validation
            </p>
          </div>
          <Button onClick={() => navigate("/new-mission")} size="lg" className="gap-2 shadow-lg">
            <Plus className="h-5 w-5" />
            Nouveau bon de mission
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total des missions
              </CardTitle>
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Toutes les missions</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-warning/10 via-warning/5 to-background">
            <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                En attente
              </CardTitle>
              <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">En cours de validation</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-success/10 via-success/5 to-background">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Approuvés
              </CardTitle>
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.approved}</div>
              <p className="text-xs text-muted-foreground mt-1">Missions validées</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-destructive/10 via-destructive/5 to-background">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Rejetés
              </CardTitle>
              <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground mt-1">Missions refusées</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-accent/10 via-accent/5 to-background">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-16 translate-x-16" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Montant total
              </CardTitle>
              <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAmount.toLocaleString()} XOF</div>
              <p className="text-xs text-muted-foreground mt-1">Toutes missions confondues</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <MissionFilters
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearchQuery}
        />

        {/* Missions List */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-2xl">Bons de mission récents</CardTitle>
            <CardDescription>
              Liste de tous les bons de mission créés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" 
                    ? "Aucun bon de mission ne correspond à votre recherche"
                    : "Aucun bon de mission créé pour le moment"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={() => navigate("/new-mission")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer votre premier bon
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="group relative flex items-center justify-between p-5 border rounded-xl hover:shadow-md cursor-pointer transition-all hover:border-primary/50 bg-card"
                    onClick={() => navigate(`/mission/${mission.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{mission.title}</h3>
                        <StatusBadge status={mission.status as any} />
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1.5">
                        <p className="font-medium text-foreground/80">Référence: {mission.reference}</p>
                        <p>📍 {mission.destination}</p>
                        <p>
                          📅 Du {format(new Date(mission.start_date), "dd MMM yyyy", { locale: fr })} au{" "}
                          {format(new Date(mission.end_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {mission.estimated_amount.toLocaleString("fr-FR")} XOF
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Créé le {format(new Date(mission.created_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
