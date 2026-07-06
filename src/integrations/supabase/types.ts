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
      audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          company_id: string | null
          created_at: string
          id: string
          manager: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          manager?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          manager?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          id: string
          license_number: string | null
          license_valid: boolean | null
          name: string
          owner_name: string
          phone: string | null
          tin: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          license_valid?: boolean | null
          name: string
          owner_name: string
          phone?: string | null
          tin?: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          license_number?: string | null
          license_valid?: boolean | null
          name?: string
          owner_name?: string
          phone?: string | null
          tin?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          contractor_name: string
          created_at: string
          date: string
          description: string | null
          has_tin: boolean | null
          has_valid_license: boolean | null
          id: string
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          branch_id?: string | null
          company_id: string
          contractor_name: string
          created_at?: string
          date: string
          description?: string | null
          has_tin?: boolean | null
          has_valid_license?: boolean | null
          id?: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          contractor_name?: string
          created_at?: string
          date?: string
          description?: string | null
          has_tin?: boolean | null
          has_valid_license?: boolean | null
          id?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customs_declarations: {
        Row: {
          bill_of_lading_no: string | null
          broker_name: string | null
          brt_amount: number | null
          brt_rate: number | null
          company_id: string | null
          country: string | null
          created_at: string
          currency: string
          customs_duty: number | null
          customs_duty_rate: number | null
          customs_office: string
          declaration_date: string
          declaration_no: string
          declaration_type: string
          exchange_rate: number
          goods_description: string
          hs_code: string | null
          id: string
          importer_tin: string | null
          invoice_value: number
          notes: string | null
          payment_date: string | null
          payment_status: string
          quantity: number | null
          receipt_no: string | null
          red_tax: number | null
          total_tax: number | null
          unit: string | null
          updated_at: string
          user_id: string
          value_afn: number
          vat_amount: number | null
          vat_rate: number | null
          vehicle_vin: string | null
        }
        Insert: {
          bill_of_lading_no?: string | null
          broker_name?: string | null
          brt_amount?: number | null
          brt_rate?: number | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          customs_duty?: number | null
          customs_duty_rate?: number | null
          customs_office: string
          declaration_date?: string
          declaration_no: string
          declaration_type: string
          exchange_rate?: number
          goods_description: string
          hs_code?: string | null
          id?: string
          importer_tin?: string | null
          invoice_value?: number
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          quantity?: number | null
          receipt_no?: string | null
          red_tax?: number | null
          total_tax?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
          value_afn?: number
          vat_amount?: number | null
          vat_rate?: number | null
          vehicle_vin?: string | null
        }
        Update: {
          bill_of_lading_no?: string | null
          broker_name?: string | null
          brt_amount?: number | null
          brt_rate?: number | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          customs_duty?: number | null
          customs_duty_rate?: number | null
          customs_office?: string
          declaration_date?: string
          declaration_no?: string
          declaration_type?: string
          exchange_rate?: number
          goods_description?: string
          hs_code?: string | null
          id?: string
          importer_tin?: string | null
          invoice_value?: number
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          quantity?: number | null
          receipt_no?: string | null
          red_tax?: number | null
          total_tax?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          value_afn?: number
          vat_amount?: number | null
          vat_rate?: number | null
          vehicle_vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_declarations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          position: string | null
          salary: number
          start_date: string | null
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          position?: string | null
          salary?: number
          start_date?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: string | null
          salary?: number
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          rate_date: string
          rate_to_afn: number
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code: string
          id?: string
          rate_date?: string
          rate_to_afn: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          rate_date?: string
          rate_to_afn?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category_id: string | null
          company_id: string
          created_at: string
          date: string
          description: string
          id: string
          quarter: number
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category_id?: string | null
          company_id: string
          created_at?: string
          date: string
          description: string
          id?: string
          quarter: number
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category_id?: string | null
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          quarter?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_tariffs: {
        Row: {
          created_at: string
          description_fa: string
          duty_rate: number
          hs_code: string
          id: string
          notes: string | null
          restricted: boolean
          updated_at: string
          vat_applicable: boolean
        }
        Insert: {
          created_at?: string
          description_fa: string
          duty_rate?: number
          hs_code: string
          id?: string
          notes?: string | null
          restricted?: boolean
          updated_at?: string
          vat_applicable?: boolean
        }
        Update: {
          created_at?: string
          description_fa?: string
          duty_rate?: number
          hs_code?: string
          id?: string
          notes?: string | null
          restricted?: boolean
          updated_at?: string
          vat_applicable?: boolean
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          created_at: string
          date: string
          description: string
          id: string
          quarter: number
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          branch_id?: string | null
          company_id: string
          created_at?: string
          date: string
          description: string
          id?: string
          quarter: number
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          quarter?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "incomes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rents: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          date: string
          description: string
          id: string
          monthly_rent: number
          user_id: string
          year: number
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          date: string
          description: string
          id?: string
          monthly_rent: number
          user_id: string
          year: number
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          monthly_rent?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          company_id: string
          company_name: string
          created_at: string
          generated_by_email: string | null
          generated_by_name: string | null
          id: string
          mode: string
          options: Json | null
          quarter: number | null
          serial_number: string
          snapshot: Json | null
          user_id: string
          year: number
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          generated_by_email?: string | null
          generated_by_name?: string | null
          id?: string
          mode: string
          options?: Json | null
          quarter?: number | null
          serial_number: string
          snapshot?: Json | null
          user_id: string
          year: number
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          generated_by_email?: string | null
          generated_by_name?: string | null
          id?: string
          mode?: string
          options?: Json | null
          quarter?: number | null
          serial_number?: string
          snapshot?: Json | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      tax_brackets: {
        Row: {
          active: boolean
          bracket_type: string
          created_at: string
          fixed_deduction: number
          id: string
          max_amount: number | null
          min_amount: number
          notes: string | null
          rate: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bracket_type: string
          created_at?: string
          fixed_deduction?: number
          id?: string
          max_amount?: number | null
          min_amount?: number
          notes?: string | null
          rate?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bracket_type?: string
          created_at?: string
          fixed_deduction?: number
          id?: string
          max_amount?: number | null
          min_amount?: number
          notes?: string | null
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          branch_id: string | null
          company_id: string
          counterparty: string | null
          created_at: string
          currency: string
          currency_id: string | null
          date: string
          description: string | null
          id: string
          meta: Json | null
          rate: number | null
          reference: string | null
          status: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          company_id: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          currency_id?: string | null
          date?: string
          description?: string | null
          id?: string
          meta?: Json | null
          rate?: number | null
          reference?: string | null
          status?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          company_id?: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          currency_id?: string | null
          date?: string
          description?: string | null
          id?: string
          meta?: Json | null
          rate?: number | null
          reference?: string | null
          status?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "accountant" | "viewer"
      company_type: "صرافی" | "تجارتی" | "خدماتی" | "تولیدی"
      transaction_type:
        | "receipt"
        | "exchange"
        | "remit_out"
        | "remit_in"
        | "remit_cancel"
        | "check"
        | "transfer"
        | "expense"
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
      app_role: ["admin", "accountant", "viewer"],
      company_type: ["صرافی", "تجارتی", "خدماتی", "تولیدی"],
      transaction_type: [
        "receipt",
        "exchange",
        "remit_out",
        "remit_in",
        "remit_cancel",
        "check",
        "transfer",
        "expense",
      ],
    },
  },
} as const
