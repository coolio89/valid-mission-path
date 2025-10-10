import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, UserPlus, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export default function Admin() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setIsAdmin(true);
        fetchData();
      } else {
        toast.error("Accès non autorisé");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch user roles with profile info
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          profiles (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (profilesError) throw profilesError;

      setUserRoles(rolesData || []);
      setProfiles(profilesData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error("Veuillez sélectionner un utilisateur et un rôle");
      return;
    }

    try {
      // Check if user already has this role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", selectedUser)
        .eq("role", selectedRole as any)
        .maybeSingle();

      if (existingRole) {
        toast.error("L'utilisateur a déjà ce rôle");
        return;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert([{ 
          user_id: selectedUser, 
          role: selectedRole as any
        }]);

      if (error) throw error;

      toast.success("Rôle ajouté avec succès");
      setSelectedUser("");
      setSelectedRole("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const removeRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Rôle supprimé avec succès");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-destructive" />
                Accès refusé
              </CardTitle>
              <CardDescription>
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Administration
          </h1>
          <p className="text-muted-foreground">
            Gérez les rôles et permissions des utilisateurs
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Guide des rôles:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Agent</strong>: Peut créer des bons de mission</li>
              <li>• <strong>Chef de Service</strong>: Valide les bons après création</li>
              <li>• <strong>Directeur</strong>: Valide après le chef de service</li>
              <li>• <strong>Finance</strong>: Validation finale avant paiement</li>
              <li>• <strong>Admin</strong>: Accès complet à l'administration</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Add Role Section */}
        <Card className="mb-6 shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Attribuer un rôle
            </CardTitle>
            <CardDescription>
              Sélectionnez un utilisateur et attribuez-lui un rôle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Utilisateur</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name} ({profile.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rôle</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="chef_service">Chef de Service</SelectItem>
                      <SelectItem value="directeur">Directeur</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={addRole} 
                className="w-full"
                disabled={!selectedUser || !selectedRole}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Attribuer le rôle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle>Utilisateurs et rôles attribués</CardTitle>
            <CardDescription>
              Gérez les rôles de chaque utilisateur - Cliquez sur la corbeille pour supprimer un rôle
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  userRoles.reduce((acc, ur) => {
                    const key = ur.user_id;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(ur);
                    return acc;
                  }, {} as Record<string, UserRole[]>)
                ).map(([userId, roles]) => {
                  const profile = roles[0]?.profiles;
                  return (
                    <div
                      key={userId}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {roles.map((userRole) => (
                          <div key={userRole.id} className="flex items-center gap-1">
                            <Badge variant="secondary">
                              {userRole.role === "chef_service" && "Chef de Service"}
                              {userRole.role === "directeur" && "Directeur"}
                              {userRole.role === "finance" && "Finance"}
                              {userRole.role === "agent" && "Agent"}
                              {userRole.role === "admin" && "Admin"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeRole(userRole.id)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
