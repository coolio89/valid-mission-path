import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function NewMission() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    destination: "",
    start_date: "",
    end_date: "",
    estimated_amount: "",
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent, submitType: "draft" | "submit") => {
    e.preventDefault();
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

      // Create mission
      const { error } = await supabase.from("mission_orders").insert({
        reference: refData,
        agent_id: profile.id,
        title: formData.title,
        description: formData.description,
        destination: formData.destination,
        start_date: formData.start_date,
        end_date: formData.end_date,
        estimated_amount: parseFloat(formData.estimated_amount),
        status: submitType === "draft" ? "draft" : "pending_service",
      });

      if (error) throw error;

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

              <div className="space-y-2">
                <Label htmlFor="estimated_amount">Montant estimé (€) *</Label>
                <Input
                  id="estimated_amount"
                  name="estimated_amount"
                  type="number"
                  step="0.01"
                  value={formData.estimated_amount}
                  onChange={handleChange}
                  placeholder="1500.00"
                  required
                />
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
