export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      mission_agents: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          mission_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          mission_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_agents_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_comments_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_expenses: {
        Row: {
          accommodation_days: number | null
          accommodation_total: number | null
          accommodation_unit_price: number | null
          created_at: string
          fuel_quantity: number | null
          fuel_total: number | null
          fuel_unit_price: number | null
          id: string
          mission_id: string
          other_expenses: number | null
          other_expenses_description: string | null
          per_diem_days: number | null
          per_diem_rate: number | null
          per_diem_total: number | null
          transport_distance: number | null
          transport_total: number | null
          transport_type: string | null
          transport_unit_price: number | null
          updated_at: string
        }
        Insert: {
          accommodation_days?: number | null
          accommodation_total?: number | null
          accommodation_unit_price?: number | null
          created_at?: string
          fuel_quantity?: number | null
          fuel_total?: number | null
          fuel_unit_price?: number | null
          id?: string
          mission_id: string
          other_expenses?: number | null
          other_expenses_description?: string | null
          per_diem_days?: number | null
          per_diem_rate?: number | null
          per_diem_total?: number | null
          transport_distance?: number | null
          transport_total?: number | null
          transport_type?: string | null
          transport_unit_price?: number | null
          updated_at?: string
        }
        Update: {
          accommodation_days?: number | null
          accommodation_total?: number | null
          accommodation_unit_price?: number | null
          created_at?: string
          fuel_quantity?: number | null
          fuel_total?: number | null
          fuel_unit_price?: number | null
          id?: string
          mission_id?: string
          other_expenses?: number | null
          other_expenses_description?: string | null
          per_diem_days?: number | null
          per_diem_rate?: number | null
          per_diem_total?: number | null
          transport_distance?: number | null
          transport_total?: number | null
          transport_type?: string | null
          transport_unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_expenses_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_orders: {
        Row: {
          actual_amount: number | null
          agent_id: string
          created_at: string | null
          description: string | null
          destination: string
          end_date: string
          estimated_amount: number
          id: string
          payment_date: string | null
          payment_method: string | null
          payment_proof_url: string | null
          project_id: string | null
          reference: string
          rejection_reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["mission_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_amount?: number | null
          agent_id: string
          created_at?: string | null
          description?: string | null
          destination: string
          end_date: string
          estimated_amount: number
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          project_id?: string | null
          reference: string
          rejection_reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["mission_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_amount?: number | null
          agent_id?: string
          created_at?: string | null
          description?: string | null
          destination?: string
          end_date?: string
          estimated_amount?: number
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          project_id?: string | null
          reference?: string
          rejection_reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["mission_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_signatures: {
        Row: {
          action: string
          comment: string | null
          id: string
          mission_id: string
          signed_at: string | null
          signer_id: string
          signer_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          comment?: string | null
          id?: string
          mission_id: string
          signed_at?: string | null
          signer_id: string
          signer_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          comment?: string | null
          id?: string
          mission_id?: string
          signed_at?: string | null
          signer_id?: string
          signer_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "mission_signatures_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_signatures_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          mission_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          mission_id?: string | null
          read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          mission_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "mission_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          spent_budget: number
          start_date: string | null
          status: string | null
          total_budget: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          spent_budget?: number
          start_date?: string | null
          status?: string | null
          total_budget?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          spent_budget?: number
          start_date?: string | null
          status?: string | null
          total_budget?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_rates: {
        Row: {
          accommodation_rate: number
          created_at: string | null
          effective_from: string
          effective_until: string | null
          id: string
          per_diem_rate: number
          role: Database["public"]["Enums"]["app_role"]
          transport_rate: number
          updated_at: string | null
        }
        Insert: {
          accommodation_rate?: number
          created_at?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          per_diem_rate?: number
          role: Database["public"]["Enums"]["app_role"]
          transport_rate?: number
          updated_at?: string | null
        }
        Update: {
          accommodation_rate?: number
          created_at?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          per_diem_rate?: number
          role?: Database["public"]["Enums"]["app_role"]
          transport_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_mission_reference: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "agent" | "chef_service" | "directeur" | "finance" | "admin"
      mission_status:
        | "draft"
        | "pending_service"
        | "pending_director"
        | "pending_finance"
        | "approved"
        | "rejected"
        | "paid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["agent", "chef_service", "directeur", "finance", "admin"],
      mission_status: [
        "draft",
        "pending_service",
        "pending_director",
        "pending_finance",
        "approved",
        "rejected",
        "paid",
      ],
    },
  },
} as const
