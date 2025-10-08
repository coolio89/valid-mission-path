import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchMissions();
    }
  }, [user]);

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
      
      setStats({ total, pending, approved, rejected });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
            <p className="text-muted-foreground">
              Gérez vos bons de mission et suivez leur validation
            </p>
          </div>
          <Button onClick={() => navigate("/new-mission")} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nouveau bon de mission
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En attente
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approuvés
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejetés
              </CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Missions List */}
        <Card>
          <CardHeader>
            <CardTitle>Bons de mission récents</CardTitle>
            <CardDescription>
              Liste de tous les bons de mission créés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : missions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Aucun bon de mission créé pour le moment
                </p>
                <Button onClick={() => navigate("/new-mission")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre premier bon
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {missions.map((mission) => (
                  <div
                    key={mission.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/mission/${mission.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{mission.title}</h3>
                        <StatusBadge status={mission.status as any} />
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Référence: {mission.reference}</p>
                        <p>Destination: {mission.destination}</p>
                        <p>
                          Du {format(new Date(mission.start_date), "dd MMM yyyy", { locale: fr })} au{" "}
                          {format(new Date(mission.end_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {mission.estimated_amount.toLocaleString("fr-FR")} €
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(mission.created_at), "dd MMM yyyy", { locale: fr })}
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
