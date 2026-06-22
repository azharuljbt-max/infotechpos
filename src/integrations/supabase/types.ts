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
      accounts: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          description: string | null
          device: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module: string
          severity: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          description?: string | null
          device?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module: string
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          description?: string | null
          device?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          severity?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          default_user_id: string | null
          email: string | null
          id: string
          industry: string | null
          is_default: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          plan: string
          status: string
          tax_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          default_user_id?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_default?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          plan?: string
          status?: string
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          default_user_id?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_default?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          plan?: string
          status?: string
          tax_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          customer_group: string | null
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_group?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_group?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          reference: string | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          reference?: string | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          reference?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          product_id: string | null
          product_name: string
          quantity: number
          sku: string | null
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_no: string
          issue_date: string
          notes: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_no: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_no?: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          account_id: string | null
          account_name: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_date: string
          id: string
          notes: string | null
          reference: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          reference?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          reference?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_archived: boolean
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          severity: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          cost: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          reorder_level: number
          sku: string | null
          status: string
          stock: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          reorder_level?: number
          sku?: string | null
          status?: string
          stock?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          reorder_level?: number
          sku?: string | null
          status?: string
          stock?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          purchase_id: string
          quantity: number
          sku: string | null
          total: number
          unit_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          purchase_id: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_cost?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          purchase_id?: string
          quantity?: number
          sku?: string | null
          total?: number
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_paid: number
          created_at: string
          discount: number
          id: string
          invoice_no: string
          notes: string | null
          payment_method: string
          purchase_date: string
          status: string
          subtotal: number
          supplier_name: string | null
          tax: number
          total: number
          updated_at: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          discount?: number
          id?: string
          invoice_no: string
          notes?: string | null
          payment_method?: string
          purchase_date?: string
          status?: string
          subtotal?: number
          supplier_name?: string | null
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          discount?: number
          id?: string
          invoice_no?: string
          notes?: string | null
          payment_method?: string
          purchase_date?: string
          status?: string
          subtotal?: number
          supplier_name?: string | null
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          quotation_id: string
          sku: string | null
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          quotation_id: string
          sku?: string | null
          total?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quotation_id?: string
          sku?: string | null
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          id: string
          issue_date: string
          notes: string | null
          quotation_no: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          quotation_no: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          quotation_no?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      saas_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          currency: string
          id: string
          method: string
          notes: string | null
          owner_id: string
          paid_at: string
          payer_msisdn: string | null
          period_end: string | null
          period_start: string | null
          status: string
          subscription_id: string | null
          txn_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          owner_id: string
          paid_at?: string
          payer_msisdn?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subscription_id?: string | null
          txn_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          owner_id?: string
          paid_at?: string
          payer_msisdn?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subscription_id?: string | null
          txn_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "saas_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plans: {
        Row: {
          billing_cycle: string
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_public: boolean
          limits: Json
          name: string
          owner_id: string
          price: number
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          name: string
          owner_id: string
          price?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          name?: string
          owner_id?: string
          price?: number
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      saas_subscriptions: {
        Row: {
          auto_renew: boolean
          cancel_at: string | null
          canceled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          notes: string | null
          owner_id: string
          plan_id: string
          started_at: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          cancel_at?: string | null
          canceled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          plan_id: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          cancel_at?: string | null
          canceled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          plan_id?: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          sku: string | null
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          sku?: string | null
          total?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          sku?: string | null
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          change_due: number
          created_at: string
          customer_name: string | null
          discount: number
          id: string
          notes: string | null
          payment_method: string
          receipt_no: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          change_due?: number
          created_at?: string
          customer_name?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_no: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          change_due?: number
          created_at?: string
          customer_name?: string | null
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_no?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          balance_after: number | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          reason: string | null
          reference: string | null
          type: string
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          type?: string
          user_id: string
        }
        Update: {
          balance_after?: number | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number
          payment_terms: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          payment_terms?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          payment_terms?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          branch: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_at: string
          owner_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          branch?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_at?: string
          owner_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          branch?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_at?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          branch: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_active_at: string | null
          owner_id: string
          role: Database["public"]["Enums"]["app_role"]
          two_factor_required: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          owner_id: string
          role?: Database["public"]["Enums"]["app_role"]
          two_factor_required?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          owner_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          two_factor_required?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string
          company_phone: string | null
          company_tax_id: string | null
          company_website: string | null
          created_at: string
          currency_code: string
          currency_position: string
          currency_symbol: string
          date_format: string
          decimal_places: number
          default_unit: string
          enabled_units: string[]
          invoice_footer: string | null
          invoice_prefix: string
          language: string
          tax_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_phone?: string | null
          company_tax_id?: string | null
          company_website?: string | null
          created_at?: string
          currency_code?: string
          currency_position?: string
          currency_symbol?: string
          date_format?: string
          decimal_places?: number
          default_unit?: string
          enabled_units?: string[]
          invoice_footer?: string | null
          invoice_prefix?: string
          language?: string
          tax_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_phone?: string | null
          company_tax_id?: string | null
          company_website?: string | null
          created_at?: string
          currency_code?: string
          currency_position?: string
          currency_symbol?: string
          date_format?: string
          decimal_places?: number
          default_unit?: string
          enabled_units?: string[]
          invoice_footer?: string | null
          invoice_prefix?: string
          language?: string
          tax_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_default: boolean
          manager: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          manager?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          manager?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _owner_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "manager" | "staff" | "viewer"
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
      app_role: ["owner", "admin", "manager", "staff", "viewer"],
    },
  },
} as const
