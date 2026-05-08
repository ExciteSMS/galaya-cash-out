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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      customer_directory: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_transaction_at: string | null
          merchant_id: string
          name: string
          notes: string | null
          phone: string
          total_spent: number | null
          total_transactions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_transaction_at?: string | null
          merchant_id: string
          name: string
          notes?: string | null
          phone: string
          total_spent?: number | null
          total_transactions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_transaction_at?: string | null
          merchant_id?: string
          name?: string
          notes?: string | null
          phone?: string
          total_spent?: number | null
          total_transactions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_directory_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      disbursements: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          merchant_id: string
          net_amount: number
          payout_account_id: string
          reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          merchant_id: string
          net_amount: number
          payout_account_id: string
          reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          merchant_id?: string
          net_amount?: number
          payout_account_id?: string
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disbursements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "merchant_payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          merchant_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          merchant_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_rollouts: {
        Row: {
          feature_key: string
          id: string
          notes: string | null
          rollout_percent: number
          target_tier_id: string | null
          updated_at: string
        }
        Insert: {
          feature_key: string
          id?: string
          notes?: string | null
          rollout_percent?: number
          target_tier_id?: string | null
          updated_at?: string
        }
        Update: {
          feature_key?: string
          id?: string
          notes?: string | null
          rollout_percent?: number
          target_tier_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          merchant_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          merchant_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          merchant_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string
          customer_phone: string
          id: string
          merchant_id: string
          points: number
          total_earned: number
          total_redeemed: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_phone: string
          id?: string
          merchant_id: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_phone?: string
          id?: string
          merchant_id?: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_payout_accounts: {
        Row: {
          account_name: string | null
          created_at: string
          id: string
          is_default: boolean
          merchant_id: string
          phone_number: string
          provider: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          merchant_id: string
          phone_number: string
          provider: string
        }
        Update: {
          account_name?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          merchant_id?: string
          phone_number?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_payout_accounts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_merchant_id: string | null
          referrer_merchant_id: string
          reward_amount: number
          reward_paid: boolean
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_merchant_id?: string | null
          referrer_merchant_id: string
          reward_amount?: number
          reward_paid?: boolean
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_merchant_id?: string | null
          referrer_merchant_id?: string
          reward_amount?: number
          reward_paid?: boolean
          status?: string
        }
        Relationships: []
      }
      merchant_staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_login: string | null
          merchant_id: string
          name: string
          phone: string
          pin_hash: string
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          merchant_id: string
          name: string
          phone: string
          pin_hash?: string
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          merchant_id?: string
          name?: string
          phone?: string
          pin_hash?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_staff_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_tiers: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          min_monthly_volume: number
          name: string
          sort_order: number
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          min_monthly_volume?: number
          name: string
          sort_order?: number
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          min_monthly_volume?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      merchant_webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_delivery_at: string | null
          last_status: string | null
          merchant_id: string
          secret: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_status?: string | null
          merchant_id: string
          secret?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_status?: string | null
          merchant_id?: string
          secret?: string
          url?: string
        }
        Relationships: []
      }
      merchants: {
        Row: {
          address: string | null
          approval_note: string | null
          approval_status: string
          created_at: string
          daily_sales_goal: number | null
          id: string
          name: string
          notification_daily_summary: boolean | null
          notification_transactions: boolean | null
          phone_number: string
          referral_code: string | null
          risk_band: string
          risk_score: number
          status: string
          tier_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          approval_note?: string | null
          approval_status?: string
          created_at?: string
          daily_sales_goal?: number | null
          id?: string
          name?: string
          notification_daily_summary?: boolean | null
          notification_transactions?: boolean | null
          phone_number: string
          referral_code?: string | null
          risk_band?: string
          risk_score?: number
          status?: string
          tier_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          approval_note?: string | null
          approval_status?: string
          created_at?: string
          daily_sales_goal?: number | null
          id?: string
          name?: string
          notification_daily_summary?: boolean | null
          notification_transactions?: boolean | null
          phone_number?: string
          referral_code?: string | null
          risk_band?: string
          risk_score?: number
          status?: string
          tier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchants_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "merchant_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          merchant_id: string | null
          message: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          id: string
          merchant_id: string
          reason: string
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          reason?: string
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          reason?: string
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_log: {
        Row: {
          category: string
          created_at: string
          error: string | null
          id: string
          merchant_id: string | null
          message: string
          recipient: string
          sender_id: string
          sent_by: string | null
          status: string
        }
        Insert: {
          category?: string
          created_at?: string
          error?: string | null
          id?: string
          merchant_id?: string | null
          message: string
          recipient: string
          sender_id?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          error?: string | null
          id?: string
          merchant_id?: string | null
          message?: string
          recipient?: string
          sender_id?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          assigned_to: string | null
          created_at: string
          id: string
          merchant_id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          city: string | null
          created_at: string
          fee: number
          id: string
          lat: number | null
          lng: number | null
          merchant_id: string
          phone: string
          provider: string
          reference: string | null
          split_group_id: string | null
          status: string
          synced_offline: boolean
          tip_amount: number
        }
        Insert: {
          amount: number
          city?: string | null
          created_at?: string
          fee?: number
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_id: string
          phone: string
          provider: string
          reference?: string | null
          split_group_id?: string | null
          status?: string
          synced_offline?: boolean
          tip_amount?: number
        }
        Update: {
          amount?: number
          city?: string | null
          created_at?: string
          fee?: number
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_id?: string
          phone?: string
          provider?: string
          reference?: string | null
          split_group_id?: string | null
          status?: string
          synced_offline?: boolean
          tip_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_merchant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
