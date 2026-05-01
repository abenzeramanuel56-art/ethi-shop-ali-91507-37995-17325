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
        }
        Relationships: []
      }
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
          customer_latitude: number | null
          customer_longitude: number | null
          delivery_fee_etb: number | null
          driver_assigned: boolean | null
          id: string
          payment_method: string | null
          payment_proof_url: string | null
          phone: string
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
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          phone: string | null
          shipping_address: string | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          full_name: string
          id: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          shipping_address?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          phone?: string | null
          shipping_address?: string | null
          terms_accepted_at?: string | null
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
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
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
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
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
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          store_name?: string
          store_slug?: string
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
      complete_service_order: {
        Args: { p_order_id: string; p_verification_code: string }
        Returns: undefined
      }
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
    }
    Enums: {
      app_role: "admin" | "customer" | "reseller" | "driver"
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
      app_role: ["admin", "customer", "reseller", "driver"],
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
