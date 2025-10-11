import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Project {
  id: string;
  name: string;
  code: string;
  total_budget: number;
  spent_budget: number;
}

interface MissionWithExpenses {
  id: string;
  reference: string;
  title: string;
  status: string;
  estimated_amount: number;
  actual_amount: number | null;
  created_at: string;
  project?: { name: string; code: string };
  expenses?: {
    per_diem_total: number;
    accommodation_total: number;
    transport_total: number;
    fuel_total: number;
    other_expenses: number;
  };
}

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 65%, 60%)'];

export default function Analytics() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [missions, setMissions] = useState<MissionWithExpenses[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalBudget: 0,
    missionsCount: 0,
    averagePerMission: 0,
  });

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, []);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_orders' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_expenses' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch missions with expenses
      const { data: missionsData, error: missionsError } = await supabase
        .from("mission_orders")
        .select(`
          *,
          project:projects(name, code),
          expenses:mission_expenses(
            per_diem_total,
            accommodation_total,
            transport_total,
            fuel_total,
            other_expenses
          )
        `)
        .order("created_at", { ascending: false });

      if (missionsError) throw missionsError;

      setProjects(projectsData || []);
      setMissions(missionsData as any || []);

      // Calculate stats
      const totalSpent = (projectsData || []).reduce((sum, p) => sum + p.spent_budget, 0);
      const totalBudget = (projectsData || []).reduce((sum, p) => sum + p.total_budget, 0);
      const missionsCount = missionsData?.length || 0;
      const averagePerMission = missionsCount > 0 ? totalSpent / missionsCount : 0;

      setStats({ totalSpent, totalBudget, missionsCount, averagePerMission });
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Data for budget by project chart
  const projectsChartData = projects.map(p => ({
    name: p.code,
    budget: p.total_budget,
    depense: p.spent_budget,
    restant: p.total_budget - p.spent_budget,
  }));

  // Data for expenses breakdown
  const expensesBreakdown = missions.reduce((acc, m) => {
    if (m.expenses && Array.isArray(m.expenses) && m.expenses.length > 0) {
      const exp = m.expenses[0];
      return {
        perDiem: acc.perDiem + (exp.per_diem_total || 0),
        accommodation: acc.accommodation + (exp.accommodation_total || 0),
        transport: acc.transport + (exp.transport_total || 0),
        fuel: acc.fuel + (exp.fuel_total || 0),
        other: acc.other + (exp.other_expenses || 0),
      };
    }
    return acc;
  }, { perDiem: 0, accommodation: 0, transport: 0, fuel: 0, other: 0 });

  const expensesBreakdownData = [
    { name: 'Per Diem', value: expensesBreakdown.perDiem },
    { name: 'Hébergement', value: expensesBreakdown.accommodation },
    { name: 'Transport', value: expensesBreakdown.transport },
    { name: 'Carburant', value: expensesBreakdown.fuel },
    { name: 'Autres', value: expensesBreakdown.other },
  ].filter(item => item.value > 0);

  // Monthly spending trend
  const monthlyData = missions.reduce((acc: any, m) => {
    const month = format(new Date(m.created_at), 'MMM yyyy', { locale: fr });
    const existing = acc.find((item: any) => item.month === month);
    if (existing) {
      existing.depenses += m.estimated_amount;
    } else {
      acc.push({ month, depenses: m.estimated_amount });
    }
    return acc;
  }, []);

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Tableau d'analyse financière
          </h1>
          <p className="text-muted-foreground">
            Suivi en temps réel des dépenses par missions et projets
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement des données...</div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Budget Total</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalBudget.toLocaleString()} XOF</div>
                  <p className="text-xs text-muted-foreground mt-1">Tous projets confondus</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-destructive/10 via-destructive/5 to-background">
                <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full -translate-y-16 translate-x-16" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">{stats.totalSpent.toLocaleString()} XOF</div>
                  <p className="text-xs text-muted-foreground mt-1">{missions.length} missions</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-success/10 via-success/5 to-background">
                <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full -translate-y-16 translate-x-16" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Budget Restant</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">
                    {(stats.totalBudget - stats.totalSpent).toLocaleString()} XOF
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((1 - stats.totalSpent / stats.totalBudget) * 100).toFixed(1)}% disponible
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-warning/10 via-warning/5 to-background">
                <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full -translate-y-16 translate-x-16" />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Moyenne par Mission</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-warning" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">{stats.averagePerMission.toLocaleString()} XOF</div>
                  <p className="text-xs text-muted-foreground mt-1">Coût moyen</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg border-none">
                <CardHeader>
                  <CardTitle>Budget par Projet</CardTitle>
                  <CardDescription>Comparaison budget vs dépenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectsChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="depense" fill="hsl(var(--destructive))" name="Dépensé" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-none">
                <CardHeader>
                  <CardTitle>Répartition des Dépenses</CardTitle>
                  <CardDescription>Par type de dépense</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensesBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${((entry.value / expensesBreakdownData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expensesBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Evolution Chart */}
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle>Évolution des Dépenses</CardTitle>
                <CardDescription>Tendance mensuelle des dépenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="depenses" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Dépenses"
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Projects Table */}
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle>Détails par Projet</CardTitle>
                <CardDescription>Suivi détaillé de chaque projet</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projet</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Budget Total</TableHead>
                      <TableHead className="text-right">Dépensé</TableHead>
                      <TableHead className="text-right">Restant</TableHead>
                      <TableHead className="text-right">% Utilisé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => {
                      const percentUsed = (project.spent_budget / project.total_budget) * 100;
                      return (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>{project.code}</TableCell>
                          <TableCell className="text-right">{project.total_budget.toLocaleString()} XOF</TableCell>
                          <TableCell className="text-right text-destructive">{project.spent_budget.toLocaleString()} XOF</TableCell>
                          <TableCell className="text-right text-success">
                            {(project.total_budget - project.spent_budget).toLocaleString()} XOF
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={percentUsed > 80 ? "text-destructive font-bold" : percentUsed > 50 ? "text-warning" : "text-success"}>
                              {percentUsed.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Missions Table */}
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle>Missions Récentes</CardTitle>
                <CardDescription>Liste des dernières missions avec leurs dépenses</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Projet</TableHead>
                      <TableHead className="text-right">Montant Estimé</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missions.slice(0, 10).map((mission) => (
                      <TableRow key={mission.id}>
                        <TableCell className="font-mono text-sm">{mission.reference}</TableCell>
                        <TableCell>{mission.title}</TableCell>
                        <TableCell>{mission.project ? `${mission.project.name} (${mission.project.code})` : '-'}</TableCell>
                        <TableCell className="text-right font-semibold">{mission.estimated_amount.toLocaleString()} XOF</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(new Date(mission.created_at), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
