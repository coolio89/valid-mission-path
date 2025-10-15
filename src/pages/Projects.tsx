import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, FolderOpen, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  total_budget: number;
  spent_budget: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    total_budget: "",
    start_date: "",
    end_date: "",
    status: "active",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des projets");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("projects").insert({
        ...formData,
        total_budget: parseFloat(formData.total_budget),
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success("Projet créé avec succès");
      setIsOpen(false);
      setFormData({
        name: "",
        code: "",
        description: "",
        total_budget: "",
        start_date: "",
        end_date: "",
        status: "active",
      });
      loadProjects();
    } catch (error: any) {
      toast.error("Erreur lors de la création du projet");
    }
  };

  const getBudgetColor = (spent: number, total: number) => {
    const percentage = (spent / total) * 100;
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <FolderOpen className="h-10 w-10 text-primary" />
              Gestion des Projets
            </h1>
            <p className="text-muted-foreground text-lg">
              Gérez les projets et suivez leurs budgets en temps réel
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-12 px-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <Plus className="mr-2 h-5 w-5" />
                Nouveau Projet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
              <DialogHeader className="space-y-3 pb-4">
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Plus className="h-6 w-6 text-primary" />
                  Créer un nouveau projet
                </DialogTitle>
                <DialogDescription className="text-base">
                  Ajoutez un nouveau projet avec son budget et ses informations
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold">Nom du projet *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="h-11"
                      placeholder="Ex: Développement App Mobile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-semibold">Code du projet *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      required
                      className="h-11 font-mono"
                      placeholder="Ex: PROJ-2024-001"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="resize-none"
                    placeholder="Décrivez le projet en quelques mots..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_budget" className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget total (XOF) *
                  </Label>
                  <Input
                    id="total_budget"
                    type="number"
                    value={formData.total_budget}
                    onChange={(e) =>
                      setFormData({ ...formData, total_budget: e.target.value })
                    }
                    required
                    className="h-11"
                    placeholder="Ex: 5000000"
                    min="0"
                    step="1000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date de début
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date de fin
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      className="h-11"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-semibold">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                      <SelectItem value="suspended">Suspendu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                  <Plus className="mr-2 h-5 w-5" />
                  Créer le projet
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="h-12 w-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground">Chargement des projets...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center animate-fade-in">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucun projet</h3>
            <p className="text-muted-foreground mb-6">
              Commencez par créer votre premier projet
            </p>
            <Button onClick={() => setIsOpen(true)} size="lg" className="shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              Créer un projet
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <Card 
                key={project.id} 
                className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <FolderOpen className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl truncate">{project.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">
                          {project.code}
                        </CardDescription>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                        project.status === "active"
                          ? "bg-success/10 text-success ring-1 ring-success/20"
                          : project.status === "completed"
                          ? "bg-muted text-muted-foreground ring-1 ring-border"
                          : "bg-warning/10 text-warning ring-1 ring-warning/20"
                      }`}
                    >
                      {project.status === "active"
                        ? "Actif"
                        : project.status === "completed"
                        ? "Terminé"
                        : "Suspendu"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed p-3 bg-muted/30 rounded-lg">
                      {project.description}
                    </p>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm p-3 bg-background rounded-lg border">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Budget total:
                      </span>
                      <span className="font-bold text-base">
                        {project.total_budget.toLocaleString()} XOF
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-3 bg-background rounded-lg border">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Dépensé:
                      </span>
                      <span
                        className={`font-bold text-base ${getBudgetColor(
                          project.spent_budget,
                          project.total_budget
                        )}`}
                      >
                        {project.spent_budget.toLocaleString()} XOF
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progression</span>
                        <span className="font-semibold">
                          {Math.min(
                            Math.round((project.spent_budget / project.total_budget) * 100),
                            100
                          )}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ease-out shadow-sm ${
                            (project.spent_budget / project.total_budget) * 100 >= 90
                              ? "bg-gradient-to-r from-destructive to-destructive/80"
                              : (project.spent_budget / project.total_budget) * 100 >= 70
                              ? "bg-gradient-to-r from-warning to-warning/80"
                              : "bg-gradient-to-r from-success to-success/80"
                          }`}
                          style={{
                            width: `${Math.min(
                              (project.spent_budget / project.total_budget) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Restant</span>
                        <span className="font-semibold">
                          {Math.max(
                            project.total_budget - project.spent_budget,
                            0
                          ).toLocaleString()} XOF
                        </span>
                      </div>
                    </div>
                  </div>
                  {project.start_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">
                        {format(new Date(project.start_date), "dd/MM/yyyy")}
                        {project.end_date && ` → ${format(new Date(project.end_date), "dd/MM/yyyy")}`}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
