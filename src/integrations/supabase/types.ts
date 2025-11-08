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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price_etb: number
          product_id: string | null
          product_name: string
          quantity: number
          quote_request_id: string | null
          reseller_profit_etb: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price_etb: number
          product_id?: string | null
          product_name: string
          quantity?: number
          quote_request_id?: string | null
          reseller_profit_etb?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price_etb?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_request_id?: string | null
          reseller_profit_etb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          city: string
          created_at: string | null
          customer_id: string
          id: string
          payment_method: string | null
          payment_proof_url: string | null
          phone: string
          reseller_id: string | null
          shipping_address: string
          status: Database["public"]["Enums"]["order_status"] | null
          store_type: string | null
          total_etb: number
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          city: string
          created_at?: string | null
          customer_id: string
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          phone: string
          reseller_id?: string | null
          shipping_address: string
          status?: Database["public"]["Enums"]["order_status"] | null
          store_type?: string | null
          total_etb: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          city?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          phone?: string
          reseller_id?: string | null
          shipping_address?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          store_type?: string | null
          total_etb?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "reseller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"] | null
          cost_usd: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price_etb: number
          stock_status: boolean | null
          unique_product_code: string | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"] | null
          cost_usd?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_etb: number
          stock_status?: boolean | null
          unique_product_code?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"] | null
          cost_usd?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_etb?: number
          stock_status?: boolean | null
          unique_product_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          shipping_address: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          full_name: string
          id: string
          phone?: string | null
          shipping_address?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          shipping_address?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          admin_notes: string | null
          aliexpress_url: string
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          photo_url: string
          product_name: string
          quantity: number
          quoted_price_etb: number | null
          status: Database["public"]["Enums"]["quote_status"] | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          aliexpress_url: string
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          photo_url: string
          product_name: string
          quantity?: number
          quoted_price_etb?: number | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          aliexpress_url?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          photo_url?: string
          product_name?: string
          quantity?: number
          quoted_price_etb?: number | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reseller_applications: {
        Row: {
          admin_notes: string | null
          age: number
          created_at: string
          full_name: string
          id: string
          id_photo_url: string
          phone: string
          reviewed_at: string | null
          status: string
          uid: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          age: number
          created_at?: string
          full_name: string
          id?: string
          id_photo_url: string
          phone: string
          reviewed_at?: string | null
          status?: string
          uid: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          age?: number
          created_at?: string
          full_name?: string
          id?: string
          id_photo_url?: string
          phone?: string
          reviewed_at?: string | null
          status?: string
          uid?: string
          user_id?: string
        }
        Relationships: []
      }
      reseller_products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          product_id: string
          reseller_price_etb: number
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id: string
          reseller_price_etb: number
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          reseller_price_etb?: number
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "reseller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_stores: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          store_name: string
          store_slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          store_name: string
          store_slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          store_name?: string
          store_slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reseller_wallets: {
        Row: {
          created_at: string | null
          current_balance_etb: number
          id: string
          total_earned_etb: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_balance_etb?: number
          id?: string
          total_earned_etb?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_balance_etb?: number
          id?: string
          total_earned_etb?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      store_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          status: string | null
          store_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          status?: string | null
          store_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          status?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "reseller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          banned_at: string | null
          banned_by: string
          id: string
          is_active: boolean | null
          reason: string
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_by: string
          id?: string
          is_active?: boolean | null
          reason: string
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_by?: string
          id?: string
          is_active?: boolean | null
          reason?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_deductions: {
        Row: {
          amount_etb: number
          created_at: string | null
          deducted_by: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount_etb: number
          created_at?: string | null
          deducted_by: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount_etb?: number
          created_at?: string | null
          deducted_by?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_detail_1: string
          account_detail_2: string | null
          admin_notes: string | null
          amount_etb: number
          created_at: string | null
          id: string
          payment_method: string
          processed_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          account_detail_1: string
          account_detail_2?: string | null
          admin_notes?: string | null
          amount_etb: number
          created_at?: string | null
          id?: string
          payment_method: string
          processed_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          account_detail_1?: string
          account_detail_2?: string | null
          admin_notes?: string | null
          amount_etb?: number
          created_at?: string | null
          id?: string
          payment_method?: string
          processed_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_from_wallet: {
        Args: {
          deduction_amount: number
          deduction_reason: string
          target_user_id: string
        }
        Returns: boolean
      }
      get_store_by_slug: {
        Args: { p_slug: string }
        Returns: {
          contact_email: string
          contact_phone: string
          id: string
          store_name: string
          store_slug: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      send_notification_to_all: {
        Args: {
          notification_message: string
          notification_title: string
          notification_type?: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "reseller"
      order_status:
        | "pending_payment"
        | "payment_verified"
        | "ready_to_order"
        | "ordered_on_aliexpress"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_category:
        | "electronics"
        | "fashion"
        | "home"
        | "beauty"
        | "sports"
        | "toys"
        | "automotive"
        | "other"
      quote_status: "pending" | "quoted" | "accepted" | "rejected"
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
      app_role: ["admin", "customer", "reseller"],
      order_status: [
        "pending_payment",
        "payment_verified",
        "ready_to_order",
        "ordered_on_aliexpress",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_category: [
        "electronics",
        "fashion",
        "home",
        "beauty",
        "sports",
        "toys",
        "automotive",
        "other",
      ],
      quote_status: ["pending", "quoted", "accepted", "rejected"],
    },
  },
} as const
