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
      activity_logs: {
        Row: {
          actions: string[] | null
          clinic_id: string | null
          contact_info: string | null
          contact_name: string | null
          created_at: string | null
          direction: string | null
          duration: string | null
          id: string
          status: string | null
          summary: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actions?: string[] | null
          clinic_id?: string | null
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string | null
          direction?: string | null
          duration?: string | null
          id?: string
          status?: string | null
          summary?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actions?: string[] | null
          clinic_id?: string | null
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string | null
          direction?: string | null
          duration?: string | null
          id?: string
          status?: string | null
          summary?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          location_id: string | null
          start_time: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          location_id?: string | null
          start_time?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          location_id?: string | null
          start_time?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_settings: {
        Row: {
          auto_pilot_enabled: boolean | null
          created_at: string | null
          id: string
          instagram_delay_seconds: number | null
          instagram_enabled: boolean | null
          location_id: string | null
          messenger_delay_seconds: number | null
          messenger_enabled: boolean | null
          phone_mode: string | null
          sms_delay_seconds: number | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_delay_seconds: number | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          auto_pilot_enabled?: boolean | null
          created_at?: string | null
          id?: string
          instagram_delay_seconds?: number | null
          instagram_enabled?: boolean | null
          location_id?: string | null
          messenger_delay_seconds?: number | null
          messenger_enabled?: boolean | null
          phone_mode?: string | null
          sms_delay_seconds?: number | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_delay_seconds?: number | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          auto_pilot_enabled?: boolean | null
          created_at?: string | null
          id?: string
          instagram_delay_seconds?: number | null
          instagram_enabled?: boolean | null
          location_id?: string | null
          messenger_delay_seconds?: number | null
          messenger_enabled?: boolean | null
          phone_mode?: string | null
          sms_delay_seconds?: number | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_delay_seconds?: number | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_integrations: {
        Row: {
          access_token: string | null
          clinic_id: string
          created_at: string | null
          id: string
          integration_type: string
          is_connected: boolean | null
          location_id: string | null
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          clinic_id: string
          created_at?: string | null
          id?: string
          integration_type: string
          is_connected?: boolean | null
          location_id?: string | null
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          integration_type?: string
          is_connected?: boolean | null
          location_id?: string | null
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_integrations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_integrations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_knowledge_base: {
        Row: {
          clinic_id: string
          content: string | null
          created_at: string | null
          file_path: string | null
          id: string
          source_type: string
          source_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          content?: string | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          source_type?: string
          source_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          content?: string | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          source_type?: string
          source_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_knowledge_base_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_locations: {
        Row: {
          address: string | null
          admin_email: string | null
          clinic_id: string
          created_at: string | null
          facebook_connected: boolean | null
          facebook_page_id: string | null
          id: string
          instagram_connected: boolean | null
          instagram_handle: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          clinic_id: string
          created_at?: string | null
          facebook_connected?: boolean | null
          facebook_page_id?: string | null
          id?: string
          instagram_connected?: boolean | null
          instagram_handle?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          clinic_id?: string
          created_at?: string | null
          facebook_connected?: boolean | null
          facebook_page_id?: string | null
          id?: string
          instagram_connected?: boolean | null
          instagram_handle?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_locations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_phone_numbers: {
        Row: {
          channel: string
          channels: string[] | null
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          location_id: string | null
          phone_number: string
          updated_at: string | null
          verification_code: string | null
          verification_expires_at: string | null
        }
        Insert: {
          channel?: string
          channels?: string[] | null
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          location_id?: string | null
          phone_number: string
          updated_at?: string | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Update: {
          channel?: string
          channels?: string[] | null
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          location_id?: string | null
          phone_number?: string
          updated_at?: string | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_phone_numbers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_phone_numbers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_schedules: {
        Row: {
          clinic_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_schedules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_users: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          admin_email: string | null
          assistant_prompt: string | null
          assistant_voice: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          assistant_prompt?: string | null
          assistant_voice?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          assistant_prompt?: string | null
          assistant_voice?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      draft_replies: {
        Row: {
          approved_at: string | null
          clinic_id: string | null
          created_at: string | null
          draft_content: string
          id: string
          log_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          clinic_id?: string | null
          created_at?: string | null
          draft_content: string
          id?: string
          log_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          clinic_id?: string | null
          created_at?: string | null
          draft_content?: string
          id?: string
          log_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_replies_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_replies_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      task_routing_rules: {
        Row: {
          assigned_user_ids: string[] | null
          assignment_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          location_id: string
          priority_filter: string | null
          rule_name: string
          source_filter: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_user_ids?: string[] | null
          assignment_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id: string
          priority_filter?: string | null
          rule_name: string
          source_filter?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_user_ids?: string[] | null
          assignment_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string
          priority_filter?: string | null
          rule_name?: string
          source_filter?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_routing_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          clinic_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_log_id: string | null
          source: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_log_id?: string | null
          source?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          clinic_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_log_id?: string | null
          source?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_log_id_fkey"
            columns: ["related_log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          clinic_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          clinic_id: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          clinic_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_belongs_to_clinic: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_clinic_admin: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
