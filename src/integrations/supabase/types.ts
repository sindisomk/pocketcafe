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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          clock_in_time: string
          clock_out_time: string | null
          created_at: string
          face_match_confidence: number | null
          id: string
          is_late: boolean | null
          late_minutes: number | null
          notes: string | null
          override_by: string | null
          override_pin_used: boolean | null
          scheduled_start_time: string | null
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          clock_in_time?: string
          clock_out_time?: string | null
          created_at?: string
          face_match_confidence?: number | null
          id?: string
          is_late?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          override_by?: string | null
          override_pin_used?: boolean | null
          scheduled_start_time?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          clock_in_time?: string
          clock_out_time?: string | null
          created_at?: string
          face_match_confidence?: number | null
          id?: string
          is_late?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          override_by?: string | null
          override_pin_used?: boolean | null
          scheduled_start_time?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_manager"
            referencedColumns: ["id"]
          },
        ]
      }
      face_search_rate_limits: {
        Row: {
          client_ip: string
          created_at: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          client_ip: string
          created_at?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          client_ip?: string
          created_at?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          accrued_hours: number | null
          created_at: string | null
          id: string
          staff_id: string
          total_entitlement_hours: number | null
          updated_at: string | null
          used_hours: number | null
          year: number | null
        }
        Insert: {
          accrued_hours?: number | null
          created_at?: string | null
          id?: string
          staff_id: string
          total_entitlement_hours?: number | null
          updated_at?: string | null
          used_hours?: number | null
          year?: number | null
        }
        Update: {
          accrued_hours?: number | null
          created_at?: string | null
          id?: string
          staff_id?: string
          total_entitlement_hours?: number | null
          updated_at?: string | null
          used_hours?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff_profiles_manager"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          deducted_at: string | null
          end_date: string
          id: string
          leave_type: string | null
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deducted_at?: string | null
          end_date: string
          id?: string
          leave_type?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deducted_at?: string | null
          end_date?: string
          id?: string
          leave_type?: string | null
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_manager"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_pins: {
        Row: {
          created_at: string
          id: string
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      no_show_records: {
        Row: {
          created_at: string | null
          detected_at: string | null
          id: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          scheduled_start_time: string
          shift_date: string
          shift_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string | null
          detected_at?: string | null
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_start_time: string
          shift_date: string
          shift_id: string
          staff_id: string
        }
        Update: {
          created_at?: string | null
          detected_at?: string | null
          id?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          scheduled_start_time?: string
          shift_date?: string
          shift_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_show_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_show_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_show_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_show_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_manager"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          read_at: string | null
          recipient_id: string
          related_record_id: string | null
          related_staff_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          recipient_id: string
          related_record_id?: string | null
          related_staff_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          recipient_id?: string
          related_record_id?: string | null
          related_staff_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_staff_id_fkey"
            columns: ["related_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_staff_id_fkey"
            columns: ["related_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_staff_id_fkey"
            columns: ["related_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_manager"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_verification_attempts: {
        Row: {
          attempt_count: number
          client_ip: string
          created_at: string
          id: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          client_ip: string
          created_at?: string
          id?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          client_ip?: string
          created_at?: string
          id?: string
          window_start?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          schedule_id: string | null
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          schedule_id?: string | null
          shift_date: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          schedule_id?: string | null
          shift_date?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles_manager"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          face_token: string | null
          hourly_rate: number
          id: string
          job_title: Database["public"]["Enums"]["job_title"] | null
          name: string
          ni_number: string | null
          nic_category: string | null
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["staff_role"]
          start_date: string | null
          tax_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          face_token?: string | null
          hourly_rate?: number
          id?: string
          job_title?: Database["public"]["Enums"]["job_title"] | null
          name: string
          ni_number?: string | null
          nic_category?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          start_date?: string | null
          tax_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          face_token?: string | null
          hourly_rate?: number
          id?: string
          job_title?: Database["public"]["Enums"]["job_title"] | null
          name?: string
          ni_number?: string | null
          nic_category?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          start_date?: string | null
          tax_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_schedules: {
        Row: {
          created_at: string
          id: string
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["schedule_status"]
          updated_at: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      staff_profiles_admin: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string | null
          face_enrolled: boolean | null
          hourly_rate: number | null
          id: string | null
          job_title: Database["public"]["Enums"]["job_title"] | null
          name: string | null
          ni_number: string | null
          nic_category: string | null
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["staff_role"] | null
          start_date: string | null
          tax_code: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          face_enrolled?: never
          hourly_rate?: number | null
          id?: string | null
          job_title?: Database["public"]["Enums"]["job_title"] | null
          name?: string | null
          ni_number?: string | null
          nic_category?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          start_date?: string | null
          tax_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          face_enrolled?: never
          hourly_rate?: number | null
          id?: string | null
          job_title?: Database["public"]["Enums"]["job_title"] | null
          name?: string | null
          ni_number?: string | null
          nic_category?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          start_date?: string | null
          tax_code?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      staff_profiles_manager: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string | null
          face_enrolled: boolean | null
          id: string | null
          job_title: Database["public"]["Enums"]["job_title"] | null
          name: string | null
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["staff_role"] | null
          start_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          face_enrolled?: never
          id?: string | null
          job_title?: Database["public"]["Enums"]["job_title"] | null
          name?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          face_enrolled?: never
          id?: string | null
          job_title?: Database["public"]["Enums"]["job_title"] | null
          name?: string | null
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_pin_attempts: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      manager_update_staff_profile: {
        Args: {
          p_contact_email?: string
          p_contact_phone?: string
          p_contract_type?: Database["public"]["Enums"]["contract_type"]
          p_job_title?: Database["public"]["Enums"]["job_title"]
          p_name?: string
          p_profile_photo_url?: string
          p_role?: Database["public"]["Enums"]["staff_role"]
          p_staff_id: string
          p_start_date?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager"
      attendance_status: "clocked_in" | "on_break" | "clocked_out"
      contract_type: "salaried" | "zero_rate"
      job_title:
        | "server"
        | "host"
        | "bartender"
        | "barback"
        | "busser"
        | "food_runner"
        | "head_chef"
        | "sous_chef"
        | "line_cook"
        | "prep_cook"
        | "dishwasher"
        | "kitchen_porter"
        | "bar_manager"
        | "mixologist"
        | "general_manager"
        | "assistant_manager"
        | "shift_supervisor"
        | "floor_manager"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      schedule_status: "draft" | "published"
      shift_type: "morning" | "evening"
      staff_role: "kitchen" | "floor" | "management" | "bar"
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
      app_role: ["admin", "manager"],
      attendance_status: ["clocked_in", "on_break", "clocked_out"],
      contract_type: ["salaried", "zero_rate"],
      job_title: [
        "server",
        "host",
        "bartender",
        "barback",
        "busser",
        "food_runner",
        "head_chef",
        "sous_chef",
        "line_cook",
        "prep_cook",
        "dishwasher",
        "kitchen_porter",
        "bar_manager",
        "mixologist",
        "general_manager",
        "assistant_manager",
        "shift_supervisor",
        "floor_manager",
      ],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      schedule_status: ["draft", "published"],
      shift_type: ["morning", "evening"],
      staff_role: ["kitchen", "floor", "management", "bar"],
    },
  },
} as const
