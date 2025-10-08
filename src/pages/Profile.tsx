import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Shield } from "lucide-react";

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
}

interface UserRole {
  role: string;
}

const roleLabels: Record<string, string> = {
  agent: "Agent",
  chef_service: "Chef de Service",
  directeur: "Directeur",
  finance: "Finance",
  admin: "Administrateur",
};

export default function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile?.full_name,
          phone: profile?.phone,
          department: profile?.department,
        })
        .eq("id", user?.id);

      if (error) throw error;
      toast.success("Profil mis à jour avec succès!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
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

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mon Profil</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>
                    Gérez vos informations de profil
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={profile?.full_name || ""}
                    onChange={(e) =>
                      setProfile({ ...profile!, full_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={profile?.phone || ""}
                    onChange={(e) =>
                      setProfile({ ...profile!, phone: e.target.value })
                    }
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Département</Label>
                  <Input
                    id="department"
                    value={profile?.department || ""}
                    onChange={(e) =>
                      setProfile({ ...profile!, department: e.target.value })
                    }
                    placeholder="Ressources Humaines"
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle>Rôles et permissions</CardTitle>
                  <CardDescription>
                    Vos rôles dans le système
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {roles.length === 0 ? (
                <p className="text-muted-foreground">Aucun rôle attribué</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge key={role.role} variant="secondary" className="text-sm">
                      {roleLabels[role.role] || role.role}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                Contactez un administrateur pour modifier vos rôles
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
