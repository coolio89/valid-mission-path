import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function NewMission() {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    destination: "",
    start_date: "",
    end_date: "",
    project_id: "",
  });
  
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [expenses, setExpenses] = useState({
    accommodation_days: "",
    accommodation_unit_price: "",
    per_diem_days: "",
    per_diem_rate: "",
    transport_type: "",
    transport_distance: "",
    transport_unit_price: "",
    fuel_quantity: "",
    fuel_unit_price: "",
    other_expenses: "",
    other_expenses_description: "",
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjectsAndAgents();
    if (isEditing) {
      loadMissionData();
    } else {
      loadDefaultRates();
    }
  }, [user, editId]);

  const loadMissionData = async () => {
    if (!editId) return;
    
    try {
      setLoading(true);
      
      // Load mission data
      const { data: missionData, error: missionError } = await supabase
        .from("mission_orders")
        .select("*")
        .eq("id", editId)
        .single();

      if (missionError) throw missionError;

      // Check if user is owner and status is draft
      if (missionData.agent_id !== user?.id || missionData.status !== 'draft') {
        toast.error("Vous ne pouvez pas modifier cette mission");
        navigate("/");
        return;
      }

      setFormData({
        title: missionData.title,
        description: missionData.description || "",
        destination: missionData.destination,
        start_date: missionData.start_date,
        end_date: missionData.end_date,
        project_id: missionData.project_id || "",
      });

      // Load expenses
      const { data: expensesData } = await supabase
        .from("mission_expenses")
        .select("*")
        .eq("mission_id", editId)
        .maybeSingle();

      if (expensesData) {
        setExpenses({
          accommodation_days: expensesData.accommodation_days.toString(),
          accommodation_unit_price: expensesData.accommodation_unit_price.toString(),
          per_diem_days: expensesData.per_diem_days.toString(),
          per_diem_rate: expensesData.per_diem_rate.toString(),
          transport_type: expensesData.transport_type || "",
          transport_distance: expensesData.transport_distance.toString(),
          transport_unit_price: expensesData.transport_unit_price.toString(),
          fuel_quantity: expensesData.fuel_quantity.toString(),
          fuel_unit_price: expensesData.fuel_unit_price.toString(),
          other_expenses: expensesData.other_expenses.toString(),
          other_expenses_description: expensesData.other_expenses_description || "",
        });
      }

      // Load mission agents
      const { data: agentsData } = await supabase
        .from("mission_agents")
        .select("agent_id")
        .eq("mission_id", editId);

      if (agentsData) {
        setSelectedAgents(agentsData.map(a => a.agent_id));
      }
    } catch (error: any) {
      toast.error("Erreur lors du chargement de la mission");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsAndAgents = async () => {
    try {
      const [projectsRes, agentsRes] = await Promise.all([
        supabase.from("projects").select("*").eq("status", "active"),
        supabase.from("profiles").select("id, full_name, email, department")
      ]);
      
      if (projectsRes.data) setProjects(projectsRes.data);
      if (agentsRes.data) setAgents(agentsRes.data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données");
    }
  };

  const loadDefaultRates = async () => {
    if (!user) return;
    
    try {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (userRoles) {
        const { data: rates } = await supabase
          .from("role_rates")
          .select("*")
          .eq("role", userRoles.role)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (rates) {
          setExpenses(prev => ({
            ...prev,
            per_diem_rate: rates.per_diem_rate.toString(),
            accommodation_unit_price: rates.accommodation_rate.toString(),
            transport_unit_price: rates.transport_rate.toString(),
          }));
        }
      }
    } catch (error: any) {
      console.log("Erreur lors du chargement des tarifs:", error);
    }
  };

  // Calculate total estimated amount
  const calculateTotal = () => {
    const accommodation = (parseFloat(expenses.accommodation_days) || 0) * (parseFloat(expenses.accommodation_unit_price) || 0);
    const perDiem = (parseFloat(expenses.per_diem_days) || 0) * (parseFloat(expenses.per_diem_rate) || 0);
    const transport = (parseFloat(expenses.transport_distance) || 0) * (parseFloat(expenses.transport_unit_price) || 0);
    const fuel = (parseFloat(expenses.fuel_quantity) || 0) * (parseFloat(expenses.fuel_unit_price) || 0);
    const other = parseFloat(expenses.other_expenses) || 0;
    return accommodation + perDiem + transport + fuel + other;
  };

  const handleSubmit = async (e: React.FormEvent, submitType: "draft" | "submit") => {
    e.preventDefault();
    
    if (selectedAgents.length === 0) {
      toast.error("Veuillez sélectionner au moins un agent");
      return;
    }
    
    setLoading(true);

    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user?.id)
        .single();

      if (profileError) throw profileError;

      // Generate reference
      const { data: refData, error: refError } = await supabase
        .rpc("generate_mission_reference");

      if (refError) throw refError;

      const estimatedAmount = calculateTotal();

      // Create mission
      const { data: missionData, error: missionError } = await supabase
        .from("mission_orders")
        .insert({
          reference: refData,
          agent_id: profile.id,
          title: formData.title,
          description: formData.description,
          destination: formData.destination,
          start_date: formData.start_date,
          end_date: formData.end_date,
          estimated_amount: estimatedAmount,
          project_id: formData.project_id || null,
          status: submitType === "draft" ? "draft" : "pending_service",
        })
        .select()
        .single();

      if (missionError) throw missionError;

      // Insert mission agents
      const missionAgentsInserts = selectedAgents.map((agentId, index) => ({
        mission_id: missionData.id,
        agent_id: agentId,
        is_primary: index === 0,
      }));
      
      const { error: agentsError } = await supabase
        .from("mission_agents")
        .insert(missionAgentsInserts);
      
      if (agentsError) throw agentsError;

      // Create expenses detail
      const { error: expensesError } = await supabase
        .from("mission_expenses")
        .insert({
          mission_id: missionData.id,
          accommodation_days: parseInt(expenses.accommodation_days) || 0,
          accommodation_unit_price: parseFloat(expenses.accommodation_unit_price) || 0,
          per_diem_days: parseInt(expenses.per_diem_days) || 0,
          per_diem_rate: parseFloat(expenses.per_diem_rate) || 0,
          transport_type: expenses.transport_type || null,
          transport_distance: parseFloat(expenses.transport_distance) || 0,
          transport_unit_price: parseFloat(expenses.transport_unit_price) || 0,
          fuel_quantity: parseFloat(expenses.fuel_quantity) || 0,
          fuel_unit_price: parseFloat(expenses.fuel_unit_price) || 0,
          other_expenses: parseFloat(expenses.other_expenses) || 0,
          other_expenses_description: expenses.other_expenses_description || null,
          accommodation_total: (parseInt(expenses.accommodation_days) || 0) * (parseFloat(expenses.accommodation_unit_price) || 0),
          per_diem_total: (parseInt(expenses.per_diem_days) || 0) * (parseFloat(expenses.per_diem_rate) || 0),
          transport_total: (parseFloat(expenses.transport_distance) || 0) * (parseFloat(expenses.transport_unit_price) || 0),
          fuel_total: (parseFloat(expenses.fuel_quantity) || 0) * (parseFloat(expenses.fuel_unit_price) || 0),
        });

      if (expensesError) throw expensesError;

      toast.success(
        submitType === "draft"
          ? "Brouillon enregistré avec succès!"
          : "Bon de mission soumis pour validation!"
      );
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleExpenseChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setExpenses({ ...expenses, [e.target.name]: e.target.value });
  };

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Nouveau bon de mission</CardTitle>
            <CardDescription>
              Créez un nouveau bon de mission qui sera soumis au workflow de validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre de la mission *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Formation commerciale à Paris"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Détails de la mission..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="Paris, France"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Projet (optionnel)</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Agents participants *</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
                  {agents.map((agent) => (
                    <div key={agent.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`agent-${agent.id}`}
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAgents([...selectedAgents, agent.id]);
                          } else {
                            setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                          }
                        }}
                      />
                      <Label htmlFor={`agent-${agent.id}`} className="cursor-pointer flex-1 font-normal">
                        {agent.full_name} {agent.department && `- ${agent.department}`}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedAgents.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedAgents.length} agent(s) sélectionné(s)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début *</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin *</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Accommodation */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Hébergement</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accommodation_days">Nombre de nuits</Label>
                    <Input
                      id="accommodation_days"
                      name="accommodation_days"
                      type="number"
                      value={expenses.accommodation_days}
                      onChange={handleExpenseChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accommodation_unit_price">Prix par nuit (€)</Label>
                    <Input
                      id="accommodation_unit_price"
                      name="accommodation_unit_price"
                      type="number"
                      step="0.01"
                      value={expenses.accommodation_unit_price}
                      onChange={handleExpenseChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {expenses.accommodation_days && expenses.accommodation_unit_price && (
                  <p className="text-sm text-muted-foreground">
                    Total hébergement: {((parseFloat(expenses.accommodation_days) || 0) * (parseFloat(expenses.accommodation_unit_price) || 0)).toFixed(2)} €
                  </p>
                )}
              </div>

              {/* Per Diem */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Indemnités journalières</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="per_diem_days">Nombre de jours</Label>
                    <Input
                      id="per_diem_days"
                      name="per_diem_days"
                      type="number"
                      value={expenses.per_diem_days}
                      onChange={handleExpenseChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="per_diem_rate">Taux journalier (€)</Label>
                    <Input
                      id="per_diem_rate"
                      name="per_diem_rate"
                      type="number"
                      step="0.01"
                      value={expenses.per_diem_rate}
                      onChange={handleExpenseChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {expenses.per_diem_days && expenses.per_diem_rate && (
                  <p className="text-sm text-muted-foreground">
                    Total indemnités: {((parseFloat(expenses.per_diem_days) || 0) * (parseFloat(expenses.per_diem_rate) || 0)).toFixed(2)} €
                  </p>
                )}
              </div>

              {/* Transport */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Transport</h3>
                <div className="space-y-2">
                  <Label htmlFor="transport_type">Type de transport</Label>
                  <Input
                    id="transport_type"
                    name="transport_type"
                    value={expenses.transport_type}
                    onChange={handleExpenseChange}
                    placeholder="Véhicule personnel, train, avion..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transport_distance">Distance (km)</Label>
                    <Input
                      id="transport_distance"
                      name="transport_distance"
                      type="number"
                      step="0.01"
                      value={expenses.transport_distance}
                      onChange={handleExpenseChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transport_unit_price">Prix/km (€)</Label>
                    <Input
                      id="transport_unit_price"
                      name="transport_unit_price"
                      type="number"
                      step="0.01"
                      value={expenses.transport_unit_price}
                      onChange={handleExpenseChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {expenses.transport_distance && expenses.transport_unit_price && (
                  <p className="text-sm text-muted-foreground">
                    Total transport: {((parseFloat(expenses.transport_distance) || 0) * (parseFloat(expenses.transport_unit_price) || 0)).toFixed(2)} €
                  </p>
                )}
              </div>

              {/* Fuel */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Carburant</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuel_quantity">Quantité (litres)</Label>
                    <Input
                      id="fuel_quantity"
                      name="fuel_quantity"
                      type="number"
                      step="0.01"
                      value={expenses.fuel_quantity}
                      onChange={handleExpenseChange}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel_unit_price">Prix/litre (€)</Label>
                    <Input
                      id="fuel_unit_price"
                      name="fuel_unit_price"
                      type="number"
                      step="0.01"
                      value={expenses.fuel_unit_price}
                      onChange={handleExpenseChange}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {expenses.fuel_quantity && expenses.fuel_unit_price && (
                  <p className="text-sm text-muted-foreground">
                    Total carburant: {((parseFloat(expenses.fuel_quantity) || 0) * (parseFloat(expenses.fuel_unit_price) || 0)).toFixed(2)} €
                  </p>
                )}
              </div>

              {/* Other Expenses */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Autres frais</h3>
                <div className="space-y-2">
                  <Label htmlFor="other_expenses">Montant (€)</Label>
                  <Input
                    id="other_expenses"
                    name="other_expenses"
                    type="number"
                    step="0.01"
                    value={expenses.other_expenses}
                    onChange={handleExpenseChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_expenses_description">Description</Label>
                  <Textarea
                    id="other_expenses_description"
                    name="other_expenses_description"
                    value={expenses.other_expenses_description}
                    onChange={handleExpenseChange}
                    placeholder="Péages, parking, repas..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Total */}
              <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Montant total estimé</span>
                  <span className="text-2xl font-bold text-primary">
                    {calculateTotal().toFixed(2)} €
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => handleSubmit(e, "draft")}
                  disabled={loading}
                  className="flex-1"
                >
                  Enregistrer en brouillon
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, "submit")}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Soumission..." : "Soumettre pour validation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
