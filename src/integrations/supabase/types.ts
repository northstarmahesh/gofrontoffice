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
          conversation_id: string | null
          created_at: string | null
          direction: string | null
          duration: string | null
          id: string
          location_id: string | null
          recording_url: string | null
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
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          duration?: string | null
          id?: string
          location_id?: string | null
          recording_url?: string | null
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
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          duration?: string | null
          id?: string
          location_id?: string | null
          recording_url?: string | null
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
            foreignKeyName: "activity_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
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
          instagram_auto_pilot: boolean | null
          instagram_delay_seconds: number | null
          instagram_enabled: boolean | null
          location_id: string | null
          messenger_auto_pilot: boolean | null
          messenger_delay_seconds: number | null
          messenger_enabled: boolean | null
          phone_mode: string | null
          sms_auto_pilot: boolean | null
          sms_delay_seconds: number | null
          sms_enabled: boolean | null
          system_enabled: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_auto_pilot: boolean | null
          whatsapp_delay_seconds: number | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          auto_pilot_enabled?: boolean | null
          created_at?: string | null
          id?: string
          instagram_auto_pilot?: boolean | null
          instagram_delay_seconds?: number | null
          instagram_enabled?: boolean | null
          location_id?: string | null
          messenger_auto_pilot?: boolean | null
          messenger_delay_seconds?: number | null
          messenger_enabled?: boolean | null
          phone_mode?: string | null
          sms_auto_pilot?: boolean | null
          sms_delay_seconds?: number | null
          sms_enabled?: boolean | null
          system_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_auto_pilot?: boolean | null
          whatsapp_delay_seconds?: number | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          auto_pilot_enabled?: boolean | null
          created_at?: string | null
          id?: string
          instagram_auto_pilot?: boolean | null
          instagram_delay_seconds?: number | null
          instagram_enabled?: boolean | null
          location_id?: string | null
          messenger_auto_pilot?: boolean | null
          messenger_delay_seconds?: number | null
          messenger_enabled?: boolean | null
          phone_mode?: string | null
          sms_auto_pilot?: boolean | null
          sms_delay_seconds?: number | null
          sms_enabled?: boolean | null
          system_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_auto_pilot?: boolean | null
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
      billing_usage: {
        Row: {
          auto_topup_enabled: boolean | null
          billing_start_date: string
          clinic_id: string
          created_at: string | null
          credits_used_this_month: number | null
          current_credits: number | null
          id: string
          included_monthly_credits: number | null
          monthly_fee: number | null
          next_billing_date: string
          setup_fee_amount: number | null
          setup_fee_paid: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_topup_enabled?: boolean | null
          billing_start_date?: string
          clinic_id: string
          created_at?: string | null
          credits_used_this_month?: number | null
          current_credits?: number | null
          id?: string
          included_monthly_credits?: number | null
          monthly_fee?: number | null
          next_billing_date?: string
          setup_fee_amount?: number | null
          setup_fee_paid?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_topup_enabled?: boolean | null
          billing_start_date?: string
          clinic_id?: string
          created_at?: string | null
          credits_used_this_month?: number | null
          current_credits?: number | null
          id?: string
          included_monthly_credits?: number | null
          monthly_fee?: number | null
          next_billing_date?: string
          setup_fee_amount?: number | null
          setup_fee_paid?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      bokadirekt_calendars: {
        Row: {
          calendar_url: string
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          service_description: string | null
          service_name: string
          updated_at: string | null
        }
        Insert: {
          calendar_url: string
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          service_description?: string | null
          service_name: string
          updated_at?: string | null
        }
        Update: {
          calendar_url?: string
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          service_description?: string | null
          service_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bokadirekt_calendars_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bokadirekt_calendars_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
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
          elevenlabs_doc_id: string | null
          file_path: string | null
          id: string
          source_type: string
          source_url: string | null
          sync_error: string | null
          sync_status: string | null
          synced_at: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          content?: string | null
          created_at?: string | null
          elevenlabs_doc_id?: string | null
          file_path?: string | null
          id?: string
          source_type?: string
          source_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          content?: string | null
          created_at?: string | null
          elevenlabs_doc_id?: string | null
          file_path?: string | null
          id?: string
          source_type?: string
          source_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          synced_at?: string | null
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
          clinic_type: string | null
          created_at: string | null
          elevenlabs_agent_id: string | null
          elevenlabs_sip_uri: string | null
          elevenlabs_voice_1_id: string | null
          elevenlabs_voice_2_id: string | null
          elevenlabs_voice_3_id: string | null
          email: string | null
          id: string
          is_demo_account: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          prepared_by_admin_id: string | null
          selected_elevenlabs_voice_id: string | null
          slug: string
          status: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          assistant_prompt?: string | null
          assistant_voice?: string | null
          clinic_type?: string | null
          created_at?: string | null
          elevenlabs_agent_id?: string | null
          elevenlabs_sip_uri?: string | null
          elevenlabs_voice_1_id?: string | null
          elevenlabs_voice_2_id?: string | null
          elevenlabs_voice_3_id?: string | null
          email?: string | null
          id?: string
          is_demo_account?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          prepared_by_admin_id?: string | null
          selected_elevenlabs_voice_id?: string | null
          slug: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          assistant_prompt?: string | null
          assistant_voice?: string | null
          clinic_type?: string | null
          created_at?: string | null
          elevenlabs_agent_id?: string | null
          elevenlabs_sip_uri?: string | null
          elevenlabs_voice_1_id?: string | null
          elevenlabs_voice_2_id?: string | null
          elevenlabs_voice_3_id?: string | null
          email?: string | null
          id?: string
          is_demo_account?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          prepared_by_admin_id?: string | null
          selected_elevenlabs_voice_id?: string | null
          slug?: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_prepared_by_admin_id_fkey"
            columns: ["prepared_by_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          id: string
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          created_at: string | null
          credits: number
          display_order: number | null
          id: string
          is_popular: boolean | null
          name: string
          price_kr: number
        }
        Insert: {
          created_at?: string | null
          credits: number
          display_order?: number | null
          id?: string
          is_popular?: boolean | null
          name: string
          price_kr: number
        }
        Update: {
          created_at?: string | null
          credits?: number
          display_order?: number | null
          id?: string
          is_popular?: boolean | null
          name?: string
          price_kr?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          clinic_id: string
          created_at: string | null
          credits_amount: number
          description: string | null
          id: string
          price_kr: number | null
          related_log_id: string | null
          task_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          credits_amount: number
          description?: string | null
          id?: string
          price_kr?: number | null
          related_log_id?: string | null
          task_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          credits_amount?: number
          description?: string | null
          id?: string
          price_kr?: number | null
          related_log_id?: string | null
          task_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_related_log_id_fkey"
            columns: ["related_log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
        ]
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
      elevenlabs_call_logs: {
        Row: {
          call_direction: string | null
          clinic_id: string
          conversation_id: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          metadata: Json | null
          transcript: Json | null
          updated_at: string | null
        }
        Insert: {
          call_direction?: string | null
          clinic_id: string
          conversation_id: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Update: {
          call_direction?: string | null
          clinic_id?: string
          conversation_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elevenlabs_call_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
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
      notification_settings: {
        Row: {
          analytics_frequency: string
          auto_topup_enabled: boolean | null
          created_at: string | null
          credit_limit_alert_enabled: boolean | null
          credit_limit_threshold: number | null
          email_enabled: boolean | null
          id: string
          location_id: string | null
          pending_tasks_time: string
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analytics_frequency?: string
          auto_topup_enabled?: boolean | null
          created_at?: string | null
          credit_limit_alert_enabled?: boolean | null
          credit_limit_threshold?: number | null
          email_enabled?: boolean | null
          id?: string
          location_id?: string | null
          pending_tasks_time?: string
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analytics_frequency?: string
          auto_topup_enabled?: boolean | null
          created_at?: string | null
          credit_limit_alert_enabled?: boolean | null
          credit_limit_threshold?: number | null
          email_enabled?: boolean | null
          id?: string
          location_id?: string | null
          pending_tasks_time?: string
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "clinic_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_leads: {
        Row: {
          additional_info: string | null
          business_name: string
          business_type: string | null
          created_at: string
          email: string
          id: string
          meeting_booked: boolean | null
          meeting_booked_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          business_name: string
          business_type?: string | null
          created_at?: string
          email: string
          id?: string
          meeting_booked?: boolean | null
          meeting_booked_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          business_name?: string
          business_type?: string | null
          created_at?: string
          email?: string
          id?: string
          meeting_booked?: boolean | null
          meeting_booked_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_top_ups: {
        Row: {
          amount_kr: number
          clinic_id: string
          credits_to_add: number
          id: string
          processed_at: string | null
          status: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          amount_kr: number
          clinic_id: string
          credits_to_add: number
          id?: string
          processed_at?: string | null
          status?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          amount_kr?: number
          clinic_id?: string
          credits_to_add?: number
          id?: string
          processed_at?: string | null
          status?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_top_ups_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          user_id?: string
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
          permissions: Json | null
          personal_number: string | null
          phone: string | null
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
          permissions?: Json | null
          personal_number?: string | null
          phone?: string | null
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
          permissions?: Json | null
          personal_number?: string | null
          phone?: string | null
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
      team_member_permissions: {
        Row: {
          can_change_ai_mode: boolean | null
          can_edit_prompts: boolean | null
          can_edit_schedule: boolean | null
          can_manage_integrations: boolean | null
          can_manage_team: boolean | null
          can_toggle_assistant: boolean | null
          can_view_billing: boolean | null
          clinic_user_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          can_change_ai_mode?: boolean | null
          can_edit_prompts?: boolean | null
          can_edit_schedule?: boolean | null
          can_manage_integrations?: boolean | null
          can_manage_team?: boolean | null
          can_toggle_assistant?: boolean | null
          can_view_billing?: boolean | null
          clinic_user_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          can_change_ai_mode?: boolean | null
          can_edit_prompts?: boolean | null
          can_edit_schedule?: boolean | null
          can_manage_integrations?: boolean | null
          can_manage_team?: boolean | null
          can_toggle_assistant?: boolean | null
          can_view_billing?: boolean | null
          clinic_user_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_member_permissions_clinic_user_id_fkey"
            columns: ["clinic_user_id"]
            isOneToOne: true
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits_atomic: {
        Args: {
          p_action_type: string
          p_clinic_id: string
          p_credits_amount: number
          p_related_log_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      is_email_platform_admin: {
        Args: { check_email: string }
        Returns: boolean
      }
      is_platform_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      user_belongs_to_clinic: {
        Args: { _clinic_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { _clinic_id: string; _permission: string; _user_id: string }
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
