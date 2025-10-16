import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Download, 
  Users, 
  Edit, 
  Trash2,
  AlertCircle 
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateMissionPDF } from "@/utils/missionPdf";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Mission {
  id: string;
  reference: string;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  actual_amount: number | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  agent_id: string;
  payment_method: string | null;
  payment_proof_url: string | null;
}

interface MissionExpense {
  accommodation_days: number;
  accommodation_unit_price: number;
  accommodation_total: number;
  per_diem_days: number;
  per_diem_rate: number;
  per_diem_total: number;
  transport_type: string | null;
  transport_distance: number;
  transport_unit_price: number;
  transport_total: number;
  fuel_quantity: number;
  fuel_unit_price: number;
  fuel_total: number;
  other_expenses: number;
  other_expenses_description: string | null;
}

interface Signature {
  id: string;
  signer_role: string;
  action: string;
  comment: string;
  signed_at: string;
  profiles: {
    full_name: string;
  };
}

interface UserRole {
  role: string;
}

const workflowSteps = [
  { role: "chef_service", label: "Chef de Service", status: "pending_service" },
  { role: "directeur", label: "Directeur", status: "pending_director" },
  { role: "finance", label: "Finance", status: "pending_finance" },
];

const roleLabels: Record<string, string> = {
  chef_service: "Chef de Service",
  directeur: "Directeur",
  finance: "Finance",
};

export default function MissionDetail() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [expenses, setExpenses] = useState<MissionExpense | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [missionAgents, setMissionAgents] = useState<any[]>([]);
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id && user) {
      fetchMissionData();
      fetchUserRoles();
      fetchMissionAgents();
    }
  }, [id, user]);

  const fetchMissionAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("mission_agents")
        .select(`
          *,
          profiles:agent_id (
            id,
            full_name,
            email,
            department
          )
        `)
        .eq("mission_id", id)
        .order("is_primary", { ascending: false });
      
      if (error) throw error;
      setMissionAgents(data || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des agents:", error);
    }
  };

  const fetchUserRoles = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id);
    setUserRoles(data || []);
  };

  const fetchMissionData = async () => {
    try {
      const { data: missionData, error: missionError } = await supabase
        .from("mission_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (missionError) throw missionError;
      setMission(missionData);

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from("mission_expenses")
        .select("*")
        .eq("mission_id", id)
        .maybeSingle();

      setExpenses(expensesData);

      const { data: signaturesData, error: signaturesError } = await supabase
        .from("mission_signatures")
        .select("*, profiles(full_name)")
        .eq("mission_id", id)
        .order("signed_at", { ascending: true });

      if (signaturesError) throw signaturesError;
      setSignatures(signaturesData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const canApprove = () => {
    if (!mission || !userRoles.length) return false;

    const currentStep = workflowSteps.find((step) => step.status === mission.status);
    if (!currentStep) return false;

    return userRoles.some((ur) => ur.role === currentStep.role);
  };

  const handleApprove = async () => {
    if (!mission) return;
    setProcessing(true);

    try {
      const currentStepIndex = workflowSteps.findIndex(
        (step) => step.status === mission.status
      );
      const nextStatus =
        currentStepIndex < workflowSteps.length - 1
          ? workflowSteps[currentStepIndex + 1].status
          : "approved";

      const currentRole = workflowSteps[currentStepIndex].role;

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user?.id)
        .single();

      // Create signature
      await supabase.from("mission_signatures").insert([{
        mission_id: mission.id,
        signer_id: profile?.id,
        signer_role: currentRole as any,
        action: "approved",
        comment: comment || null,
      }]);

      // Update mission status
      await supabase
        .from("mission_orders")
        .update({ status: nextStatus as any })
        .eq("id", mission.id);

      toast.success("Mission approuvée avec succès!");
      setComment("");
      fetchMissionData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!mission || !comment) {
      toast.error("Veuillez fournir un motif de rejet");
      return;
    }
    setProcessing(true);

    try {
      const currentStep = workflowSteps.find(
        (step) => step.status === mission.status
      );

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user?.id)
        .single();

      // Create signature
      await supabase.from("mission_signatures").insert([{
        mission_id: mission.id,
        signer_id: profile?.id,
        signer_role: currentStep?.role as any,
        action: "rejected",
        comment,
      }]);

      // Update mission status
      await supabase
        .from("mission_orders")
        .update({
          status: "rejected" as any,
          rejection_reason: comment,
        })
        .eq("id", mission.id);

      toast.success("Mission rejetée");
      setComment("");
      fetchMissionData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!mission || mission.status !== 'draft') {
      toast.error("Seuls les bons en brouillon peuvent être supprimés");
      return;
    }

    try {
      const { error } = await supabase
        .from("mission_orders")
        .delete()
        .eq("id", mission.id);

      if (error) throw error;

      toast.success("Bon de mission supprimé avec succès");
      navigate("/");
    } catch (error: any) {
      toast.error("Erreur lors de la suppression: " + error.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <div className="text-lg">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (!mission) {
    return (
      <Layout>
        <div className="p-8">
          <p>Mission introuvable</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
          <div className="flex gap-2">
            {mission?.status === 'draft' && mission?.agent_id === user?.id && (
              <>
                <Button
                  onClick={() => navigate(`/new-mission?edit=${mission.id}`)}
                  variant="outline"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Confirmer la suppression
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer ce bon de mission ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            {mission?.status !== 'draft' && expenses && (
              <Button
                onClick={() => generateMissionPDF(mission, expenses, missionAgents.map(ma => ma.profiles))}
                variant="default"
              >
                <Download className="mr-2 h-4 w-4" />
                Générer l'ordre de mission
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Mission Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{mission.title}</CardTitle>
                  <CardDescription>Référence: {mission.reference}</CardDescription>
                </div>
                <StatusBadge status={mission.status as any} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mission.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{mission.description}</p>
                </div>
              )}

               <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Destination</h3>
                  <p className="text-muted-foreground">{mission.destination}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Montant estimé</h3>
                  <p className="text-muted-foreground">
                    {mission.estimated_amount.toLocaleString("fr-FR")} XOF
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Agents participants
                </h3>
                {missionAgents.length > 0 ? (
                  <ul className="space-y-1">
                    {missionAgents.map((ma) => (
                      <li key={ma.id} className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {ma.profiles?.full_name}
                          {ma.is_primary && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Principal
                            </span>
                          )}
                        </span>
                        {ma.profiles?.department && (
                          <span className="text-xs">({ma.profiles.department})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Aucun agent supplémentaire</p>
                )}
                <div>
                  <h3 className="font-semibold mb-1">Date de début</h3>
                  <p className="text-muted-foreground">
                    {format(new Date(mission.start_date), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Date de fin</h3>
                  <p className="text-muted-foreground">
                    {format(new Date(mission.end_date), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>

              {mission.rejection_reason && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <h3 className="font-semibold mb-1 text-destructive">
                    Motif de rejet
                  </h3>
                  <p className="text-sm">{mission.rejection_reason}</p>
                </div>
              )}

              {(mission.payment_method || mission.payment_proof_url) && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold mb-3">Informations de paiement</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {mission.payment_method && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Moyen de paiement</p>
                        <p className="capitalize">{mission.payment_method.replace('_', ' ')}</p>
                      </div>
                    )}
                    {mission.payment_proof_url && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Preuve de paiement</p>
                        <a 
                          href={mission.payment_proof_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          Voir le document
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses Detail */}
          {expenses && (
            <Card>
              <CardHeader>
                <CardTitle>Détail des frais</CardTitle>
                <CardDescription>
                  Décomposition du montant estimé
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenses.accommodation_days > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">Hébergement</p>
                      <p className="text-sm text-muted-foreground">
                        {expenses.accommodation_days} nuits × {expenses.accommodation_unit_price.toLocaleString()} XOF
                      </p>
                    </div>
                    <p className="font-semibold">{expenses.accommodation_total.toLocaleString()} XOF</p>
                  </div>
                )}

                {expenses.per_diem_days > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">Indemnités journalières</p>
                      <p className="text-sm text-muted-foreground">
                        {expenses.per_diem_days} jours × {expenses.per_diem_rate.toLocaleString()} XOF
                      </p>
                    </div>
                    <p className="font-semibold">{expenses.per_diem_total.toLocaleString()} XOF</p>
                  </div>
                )}

                {expenses.transport_distance > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">Transport</p>
                      <p className="text-sm text-muted-foreground">
                        {expenses.transport_type && `${expenses.transport_type} - `}
                        {expenses.transport_distance} km × {expenses.transport_unit_price.toLocaleString()} XOF
                      </p>
                    </div>
                    <p className="font-semibold">{expenses.transport_total.toLocaleString()} XOF</p>
                  </div>
                )}

                {expenses.fuel_quantity > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">Carburant</p>
                      <p className="text-sm text-muted-foreground">
                        {expenses.fuel_quantity} L × {expenses.fuel_unit_price.toLocaleString()} XOF
                      </p>
                    </div>
                    <p className="font-semibold">{expenses.fuel_total.toLocaleString()} XOF</p>
                  </div>
                )}

                {expenses.other_expenses > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold">Autres frais</p>
                      {expenses.other_expenses_description && (
                        <p className="text-sm text-muted-foreground">
                          {expenses.other_expenses_description}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold">{expenses.other_expenses.toLocaleString()} XOF</p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold">Total</p>
                    <p className="text-xl font-bold text-primary">
                      {mission.estimated_amount.toLocaleString()} XOF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow de validation</CardTitle>
              <CardDescription>
                Progression de la validation du bon de mission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowSteps.map((step, index) => {
                  const signature = signatures.find(
                    (sig) => sig.signer_role === step.role
                  );
                  const isCompleted = signature !== undefined;
                  const isCurrent = mission.status === step.status;
                  const isPending =
                    !isCompleted &&
                    (index === 0 ||
                      signatures.some(
                        (sig) =>
                          sig.signer_role === workflowSteps[index - 1]?.role &&
                          sig.action === "approved"
                      ));

                  return (
                    <div
                      key={step.role}
                      className={`flex items-start gap-4 p-4 rounded-lg border ${
                        isCompleted
                          ? signature.action === "approved"
                            ? "bg-success/5 border-success"
                            : "bg-destructive/5 border-destructive"
                          : isCurrent
                          ? "bg-warning/5 border-warning"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="mt-1">
                        {isCompleted ? (
                          signature.action === "approved" ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )
                        ) : isCurrent ? (
                          <Clock className="h-5 w-5 text-warning" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{step.label}</h3>
                        {isCompleted && (
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {signature.action === "approved"
                                ? "Approuvé"
                                : "Rejeté"}{" "}
                              par {signature.profiles.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(signature.signed_at), "dd MMM yyyy à HH:mm", {
                                locale: fr,
                              })}
                            </p>
                            {signature.comment && (
                              <p className="text-sm mt-2 italic">
                                "{signature.comment}"
                              </p>
                            )}
                          </div>
                        )}
                        {isCurrent && (
                          <p className="text-sm text-warning mt-1">
                            En attente de validation
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {canApprove() && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Commentaire (optionnel)
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Ajoutez un commentaire..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={processing || !comment}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
