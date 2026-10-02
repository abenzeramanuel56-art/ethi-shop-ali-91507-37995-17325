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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advertisements: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_duration_seconds: number
          display_order: number
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          quiz_difficulty: string
          time_gap_minutes: number
          title: string
          trigger_path: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_duration_seconds?: number
          display_order?: number
          id?: string
          is_active?: boolean
          media_type: string
          media_url: string
          quiz_difficulty?: string
          time_gap_minutes?: number
          title: string
          trigger_path?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_duration_seconds?: number
          display_order?: number
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          quiz_difficulty?: string
          time_gap_minutes?: number
          title?: string
          trigger_path?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_orders: {
        Row: {
          admin_notes: string | null
          affiliate_product_id: string
          affiliate_profit_etb: number
          affiliate_store_id: string
          base_price_etb: number
          buyer_id: string | null
          city: string | null
          created_at: string
          customer_latitude: number | null
          customer_longitude: number | null
          id: string
          original_product_id: string
          payment_proof_url: string | null
          phone: string | null
          platform_earning_etb: number
          quantity: number
          shipping_address: string | null
          sold_price_etb: number
          status: string
          total_etb: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_product_id: string
          affiliate_profit_etb: number
          affiliate_store_id: string
          base_price_etb: number
          buyer_id?: string | null
          city?: string | null
          created_at?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          id?: string
          original_product_id: string
          payment_proof_url?: string | null
          phone?: string | null
          platform_earning_etb: number
          quantity?: number
          shipping_address?: string | null
          sold_price_etb: number
          status?: string
          total_etb: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_product_id?: string
          affiliate_profit_etb?: number
          affiliate_store_id?: string
          base_price_etb?: number
          buyer_id?: string | null
          city?: string | null
          created_at?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          id?: string
          original_product_id?: string
          payment_proof_url?: string | null
          phone?: string | null
          platform_earning_etb?: number
          quantity?: number
          shipping_address?: string | null
          sold_price_etb?: number
          status?: string
          total_etb?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_orders_affiliate_product_id_fkey"
            columns: ["affiliate_product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_orders_affiliate_store_id_fkey"
            columns: ["affiliate_store_id"]
            isOneToOne: false
            referencedRelation: "affiliate_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_orders_original_product_id_fkey"
            columns: ["original_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_products: {
        Row: {
          affiliate_store_id: string
          click_count: number
          created_at: string
          custom_price_etb: number
          custom_title: string | null
          id: string
          is_active: boolean
          original_product_id: string
          sale_count: number
          updated_at: string
        }
        Insert: {
          affiliate_store_id: string
          click_count?: number
          created_at?: string
          custom_price_etb: number
          custom_title?: string | null
          id?: string
          is_active?: boolean
          original_product_id: string
          sale_count?: number
          updated_at?: string
        }
        Update: {
          affiliate_store_id?: string
          click_count?: number
          created_at?: string
          custom_price_etb?: number
          custom_title?: string | null
          id?: string
          is_active?: boolean
          original_product_id?: string
          sale_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_products_affiliate_store_id_fkey"
            columns: ["affiliate_store_id"]
            isOneToOne: false
            referencedRelation: "affiliate_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_products_original_product_id_fkey"
            columns: ["original_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_stores: {
        Row: {
          bio: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          store_name: string
          store_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          store_name: string
          store_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          store_name?: string
          store_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_wallets: {
        Row: {
          created_at: string
          current_balance_etb: number
          id: string
          total_earned_etb: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance_etb?: number
          id?: string
          total_earned_etb?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance_etb?: number
          id?: string
          total_earned_etb?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_instructions: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          instruction: string
          is_active: boolean
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          instruction: string
          is_active?: boolean
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          instruction?: string
          is_active?: boolean
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          seller_id: string
          subject: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          seller_id: string
          subject?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          seller_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_orders: {
        Row: {
          admin_notes: string | null
          buyer_id: string
          created_at: string | null
          digital_product_id: string
          download_code: string | null
          download_count: number | null
          id: string
          payment_method: string | null
          payment_proof_url: string | null
          price_etb: number
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          buyer_id: string
          created_at?: string | null
          digital_product_id: string
          download_code?: string | null
          download_count?: number | null
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          price_etb: number
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          buyer_id?: string
          created_at?: string | null
          digital_product_id?: string
          download_code?: string | null
          download_count?: number | null
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          price_etb?: number
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_orders_digital_product_id_fkey"
            columns: ["digital_product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          ai_verification_notes: string | null
          ai_verification_status: string
          category: string
          created_at: string | null
          description: string
          file_name: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          is_active: boolean | null
          preview_url: string | null
          price_etb: number
          product_type: string
          seller_id: string
          store_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_verification_notes?: string | null
          ai_verification_status?: string
          category?: string
          created_at?: string | null
          description: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          preview_url?: string | null
          price_etb: number
          product_type: string
          seller_id: string
          store_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_verification_notes?: string | null
          ai_verification_status?: string
          category?: string
          created_at?: string | null
          description?: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          preview_url?: string | null
          price_etb?: number
          product_type?: string
          seller_id?: string
          store_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_applications: {
        Row: {
          admin_notes: string | null
          age: number
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          id_back_photo_url: string
          id_front_photo_url: string
          license_plate: string | null
          phone: string
          reviewed_at: string | null
          status: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          admin_notes?: string | null
          age: number
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_back_photo_url: string
          id_front_photo_url: string
          license_plate?: string | null
          phone: string
          reviewed_at?: string | null
          status?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          admin_notes?: string | null
          age?: number
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_back_photo_url?: string
          id_front_photo_url?: string
          license_plate?: string | null
          phone?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      driver_orders: {
        Row: {
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          customer_confirmed_delivery: boolean | null
          customer_latitude: number | null
          customer_longitude: number | null
          customer_phone: string | null
          delivered_at: string | null
          distance_km: number | null
          driver_earning_etb: number | null
          driver_id: string
          id: string
          location_updated_at: string | null
          order_id: string
          pickup_at: string | null
          seller_confirmed_pickup: boolean | null
          seller_latitude: number | null
          seller_longitude: number | null
          seller_phone: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_confirmed_delivery?: boolean | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_phone?: string | null
          delivered_at?: string | null
          distance_km?: number | null
          driver_earning_etb?: number | null
          driver_id: string
          id?: string
          location_updated_at?: string | null
          order_id: string
          pickup_at?: string | null
          seller_confirmed_pickup?: boolean | null
          seller_latitude?: number | null
          seller_longitude?: number | null
          seller_phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          customer_confirmed_delivery?: boolean | null
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_phone?: string | null
          delivered_at?: string | null
          distance_km?: number | null
          driver_earning_etb?: number | null
          driver_id?: string
          id?: string
          location_updated_at?: string | null
          order_id?: string
          pickup_at?: string | null
          seller_confirmed_pickup?: boolean | null
          seller_latitude?: number | null
          seller_longitude?: number | null
          seller_phone?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wallets: {
        Row: {
          created_at: string | null
          current_balance_etb: number
          id: string
          last_latitude: number | null
          last_location_updated_at: string | null
          last_longitude: number | null
          total_earned_etb: number
          updated_at: string | null
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          current_balance_etb?: number
          id?: string
          last_latitude?: number | null
          last_location_updated_at?: string | null
          last_longitude?: number | null
          total_earned_etb?: number
          updated_at?: string | null
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          current_balance_etb?: number
          id?: string
          last_latitude?: number | null
          last_location_updated_at?: string | null
          last_longitude?: number | null
          total_earned_etb?: number
          updated_at?: string | null
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          link?: string | null
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
          customer_latitude: number | null
          customer_longitude: number | null
          delivery_fee_etb: number | null
          driver_assigned: boolean | null
          id: string
          payment_method: string | null
          payment_proof_url: string | null
          phone: string
          preferred_vehicle_type: string | null
          reseller_id: string | null
          seller_id: string | null
          seller_notified: boolean | null
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
          customer_latitude?: number | null
          customer_longitude?: number | null
          delivery_fee_etb?: number | null
          driver_assigned?: boolean | null
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          phone: string
          preferred_vehicle_type?: string | null
          reseller_id?: string | null
          seller_id?: string | null
          seller_notified?: boolean | null
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
          customer_latitude?: number | null
          customer_longitude?: number | null
          delivery_fee_etb?: number | null
          driver_assigned?: boolean | null
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          phone?: string
          preferred_vehicle_type?: string | null
          reseller_id?: string | null
          seller_id?: string | null
          seller_notified?: boolean | null
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
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_driver_orders: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          city: string | null
          created_at: string
          customer_latitude: number | null
          customer_longitude: number | null
          customer_phone: string | null
          distance_km: number | null
          estimated_earning_etb: number | null
          id: string
          order_id: string
          preferred_vehicle_type: string | null
          seller_id: string | null
          seller_latitude: number | null
          seller_longitude: number | null
          seller_phone: string | null
          shipping_address: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          city?: string | null
          created_at?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_phone?: string | null
          distance_km?: number | null
          estimated_earning_etb?: number | null
          id?: string
          order_id: string
          preferred_vehicle_type?: string | null
          seller_id?: string | null
          seller_latitude?: number | null
          seller_longitude?: number | null
          seller_phone?: string | null
          shipping_address?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          city?: string | null
          created_at?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_phone?: string | null
          distance_km?: number | null
          estimated_earning_etb?: number | null
          id?: string
          order_id?: string
          preferred_vehicle_type?: string | null
          seller_id?: string | null
          seller_latitude?: number | null
          seller_longitude?: number | null
          seller_phone?: string | null
          shipping_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_driver_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_driver_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          aliexpress_url: string | null
          badge: string | null
          category: Database["public"]["Enums"]["product_category"] | null
          cost_usd: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price_etb: number
          seller_id: string | null
          stock_status: boolean | null
          unique_product_code: string | null
          updated_at: string | null
        }
        Insert: {
          aliexpress_url?: string | null
          badge?: string | null
          category?: Database["public"]["Enums"]["product_category"] | null
          cost_usd?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_etb: number
          seller_id?: string | null
          stock_status?: boolean | null
          unique_product_code?: string | null
          updated_at?: string | null
        }
        Update: {
          aliexpress_url?: string | null
          badge?: string | null
          category?: Database["public"]["Enums"]["product_category"] | null
          cost_usd?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_etb?: number
          seller_id?: string | null
          stock_status?: boolean | null
          unique_product_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string | null
          full_name: string
          id: string
          language: string
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          phone: string | null
          shipping_address: string | null
          telegram_id: number | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          full_name: string
          id: string
          language?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          shipping_address?: string | null
          telegram_id?: number | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          language?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          shipping_address?: string | null
          telegram_id?: number | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
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
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount_etb: number
          created_at: string | null
          customer_id: string
          id: string
          order_id: string
          processed_at: string | null
          reason: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          amount_etb: number
          created_at?: string | null
          customer_id: string
          id?: string
          order_id: string
          processed_at?: string | null
          reason: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          amount_etb?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: string
          processed_at?: string | null
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_applications: {
        Row: {
          admin_notes: string | null
          age: number
          created_at: string
          email: string | null
          face_descriptor: Json | null
          face_photo_url: string | null
          full_name: string
          id: string
          id_back_photo_url: string | null
          id_front_photo_url: string | null
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
          email?: string | null
          face_descriptor?: Json | null
          face_photo_url?: string | null
          full_name: string
          id?: string
          id_back_photo_url?: string | null
          id_front_photo_url?: string | null
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
          email?: string | null
          face_descriptor?: Json | null
          face_photo_url?: string | null
          full_name?: string
          id?: string
          id_back_photo_url?: string | null
          id_front_photo_url?: string | null
          id_photo_url?: string
          phone?: string
          reviewed_at?: string | null
          status?: string
          uid?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          product_id: string
          seller_price_etb: number
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id: string
          seller_price_etb: number
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          product_id?: string
          seller_price_etb?: number
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
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_stores: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          has_tin: boolean
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          store_name: string
          store_slug: string
          tin_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          has_tin?: boolean
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          store_name: string
          store_slug: string
          tin_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          has_tin?: boolean
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          store_name?: string
          store_slug?: string
          tin_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seller_wallets: {
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
      service_orders: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string
          customer_latitude: number | null
          customer_longitude: number | null
          customer_name: string | null
          customer_phone: string
          hours: number | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_proof_url: string | null
          quantity: number | null
          seller_confirmed: boolean | null
          seller_id: string
          service_id: string
          status: string
          total_etb: number
          updated_at: string | null
          verification_code: string | null
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name?: string | null
          customer_phone: string
          hours?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          quantity?: number | null
          seller_confirmed?: boolean | null
          seller_id: string
          service_id: string
          status?: string
          total_etb: number
          updated_at?: string | null
          verification_code?: string | null
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          customer_latitude?: number | null
          customer_longitude?: number | null
          customer_name?: string | null
          customer_phone?: string
          hours?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          quantity?: number | null
          seller_confirmed?: boolean | null
          seller_id?: string
          service_id?: string
          status?: string
          total_etb?: number
          updated_at?: string | null
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          custom_category: string | null
          description: string
          id: string
          is_active: boolean | null
          price_etb: number
          price_type: string
          seller_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          custom_category?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          price_etb: number
          price_type?: string
          seller_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          custom_category?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          price_etb?: number
          price_type?: string
          seller_id?: string
          title?: string
          updated_at?: string | null
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
          digital_product_id: string | null
          id: string
          product_id: string | null
          reason: string
          report_type: string
          reporter_id: string
          reviewed_at: string | null
          status: string | null
          store_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          digital_product_id?: string | null
          id?: string
          product_id?: string | null
          reason: string
          report_type?: string
          reporter_id: string
          reviewed_at?: string | null
          status?: string | null
          store_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          description?: string | null
          digital_product_id?: string | null
          id?: string
          product_id?: string | null
          reason?: string
          report_type?: string
          reporter_id?: string
          reviewed_at?: string | null
          status?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          attachment_url: string | null
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
          attachment_url?: string | null
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
          attachment_url?: string | null
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
      telegram_link_tokens: {
        Row: {
          created_at: string
          expires_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          telegram_id: number
          telegram_username: string | null
          verification_code: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          telegram_id: number
          telegram_username?: string | null
          verification_code: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          telegram_id?: number
          telegram_username?: string | null
          verification_code?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_label: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_label?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_label?: string | null
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
      user_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          label: string | null
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          label?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          user_agent?: string | null
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
      user_suspensions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          reason: string
          suspended_at: string | null
          suspended_by: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          reason: string
          suspended_at?: string | null
          suspended_by: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          reason?: string
          suspended_at?: string | null
          suspended_by?: string
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          user_id: string
          warned_by: string
          warning_number: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          user_id: string
          warned_by: string
          warning_number?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          user_id?: string
          warned_by?: string
          warning_number?: number
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
      admin_advance_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
        }
        Returns: undefined
      }
      admin_approve_driver_application: {
        Args: { p_admin_notes?: string; p_application_id: string }
        Returns: undefined
      }
      admin_approve_seller_application: {
        Args: { p_admin_notes?: string; p_application_id: string }
        Returns: undefined
      }
      admin_ban_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: string
      }
      admin_factory_reset_transactional: { Args: never; Returns: undefined }
      admin_suspend_user: {
        Args: { p_days: number; p_reason: string; p_user_id: string }
        Returns: string
      }
      admin_verify_affiliate_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      affiliate_product_click: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      complete_service_order: {
        Args: { p_order_id: string; p_verification_code: string }
        Returns: undefined
      }
      create_affiliate_store: {
        Args: {
          p_bio: string
          p_contact_phone: string
          p_store_name: string
          p_store_slug: string
        }
        Returns: string
      }
      create_telegram_link_token: { Args: never; Returns: string }
      customer_confirm_delivery: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      deduct_from_wallet: {
        Args: {
          deduction_amount: number
          deduction_reason: string
          target_user_id: string
        }
        Returns: boolean
      }
      driver_accept_pending_order: {
        Args: { p_pending_id: string }
        Returns: string
      }
      driver_confirm_delivery: {
        Args: { p_driver_order_id: string }
        Returns: boolean
      }
      driver_confirm_pickup: {
        Args: { p_driver_order_id: string }
        Returns: boolean
      }
      driver_update_location: {
        Args: { p_driver_order_id: string; p_lat: number; p_lng: number }
        Returns: undefined
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
      notify_admins: {
        Args: {
          p_link: string
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      remind_telegram_link: { Args: never; Returns: boolean }
      seller_confirm_service_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      send_notification_to_all: {
        Args: {
          notification_message: string
          notification_title: string
          notification_type?: string
        }
        Returns: number
      }
      verify_telegram_code: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "customer" | "reseller" | "driver" | "affiliate"
      order_status:
        | "pending_payment"
        | "payment_verified"
        | "ready_to_order"
        | "ordered_on_aliexpress"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "awaiting_customer_confirmation"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "customer", "reseller", "driver", "affiliate"],
      order_status: [
        "pending_payment",
        "payment_verified",
        "ready_to_order",
        "ordered_on_aliexpress",
        "shipped",
        "delivered",
        "cancelled",
        "awaiting_customer_confirmation",
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
