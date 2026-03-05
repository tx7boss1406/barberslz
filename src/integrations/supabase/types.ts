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
      barbeiros: {
        Row: {
          avaliacao: number | null
          bio: string | null
          created_at: string | null
          especialidade: string | null
          foto_url: string | null
          id: string
          nome: string | null
          status: boolean | null
        }
        Insert: {
          avaliacao?: number | null
          bio?: string | null
          created_at?: string | null
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          nome?: string | null
          status?: boolean | null
        }
        Update: {
          avaliacao?: number | null
          bio?: string | null
          created_at?: string | null
          especialidade?: string | null
          foto_url?: string | null
          id?: string
          nome?: string | null
          status?: boolean | null
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          created_at: string
          dias_ativos: Json | null
          endereco_url: string | null
          horario_abertura: string
          horario_fechamento: string
          id: string
          instagram: string | null
          intervalo_minutos: number
          lembrete_24h: boolean | null
          lembrete_2h: boolean | null
          max_agendamentos_simultaneos: number
          mensagem_pos_reserva: string | null
          meta_mensal: number | null
          nome_barbearia: string | null
          pix_copy_paste_code: string | null
          pix_key: string | null
          pix_qr_image_url: string | null
          plano_creditos: number | null
          plano_nome: string | null
          plano_preco: number | null
          push_admin_ativo: boolean | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          dias_ativos?: Json | null
          endereco_url?: string | null
          horario_abertura: string
          horario_fechamento: string
          id?: string
          instagram?: string | null
          intervalo_minutos: number
          lembrete_24h?: boolean | null
          lembrete_2h?: boolean | null
          max_agendamentos_simultaneos: number
          mensagem_pos_reserva?: string | null
          meta_mensal?: number | null
          nome_barbearia?: string | null
          pix_copy_paste_code?: string | null
          pix_key?: string | null
          pix_qr_image_url?: string | null
          plano_creditos?: number | null
          plano_nome?: string | null
          plano_preco?: number | null
          push_admin_ativo?: boolean | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          dias_ativos?: Json | null
          endereco_url?: string | null
          horario_abertura?: string
          horario_fechamento?: string
          id?: string
          instagram?: string | null
          intervalo_minutos?: number
          lembrete_24h?: boolean | null
          lembrete_2h?: boolean | null
          max_agendamentos_simultaneos?: number
          mensagem_pos_reserva?: string | null
          meta_mensal?: number | null
          nome_barbearia?: string | null
          pix_copy_paste_code?: string | null
          pix_key?: string | null
          pix_qr_image_url?: string | null
          plano_creditos?: number | null
          plano_nome?: string | null
          plano_preco?: number | null
          push_admin_ativo?: boolean | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      reservas: {
        Row: {
          barbeiro_id: string
          cliente_nome: string
          cliente_telefone: string
          created_at: string
          data: string
          horario: string
          id: string
          servico_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          user_id: string | null
        }
        Insert: {
          barbeiro_id: string
          cliente_nome: string
          cliente_telefone: string
          created_at?: string
          data: string
          horario: string
          id?: string
          servico_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          user_id?: string | null
        }
        Update: {
          barbeiro_id?: string
          cliente_nome?: string
          cliente_telefone?: string
          created_at?: string
          data?: string
          horario?: string
          id?: string
          servico_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_barbeiro_id_fkey"
            columns: ["barbeiro_id"]
            isOneToOne: false
            referencedRelation: "barbeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          created_at: string
          descricao: string | null
          duracao: number
          id: string
          nome: string
          preco: number
          status: boolean
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          duracao: number
          id?: string
          nome: string
          preco: number
          status: boolean
        }
        Update: {
          created_at?: string
          descricao?: string | null
          duracao?: number
          id?: string
          nome?: string
          preco?: number
          status?: boolean
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by_admin: string | null
          created_at: string
          id: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          proof_url: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by_admin?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          proof_url?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by_admin?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          proof_url?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          credits_available: number
          credits_total: number
          credits_used: number
          id: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          plan_type: string
          price: number
          renewal_date: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_available?: number
          credits_total?: number
          credits_used?: number
          id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_type?: string
          price?: number
          renewal_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_available?: number
          credits_total?: number
          credits_used?: number
          id?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_type?: string
          price?: number
          renewal_date?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      app_role: "admin" | "funcionario"
      payment_status: "awaiting_payment" | "paid" | "failed"
      reservation_status: "pendente" | "confirmado" | "cancelado" | "concluido"
      subscription_status: "pending_payment" | "active" | "expired" | "canceled"
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
      app_role: ["admin", "funcionario"],
      payment_status: ["awaiting_payment", "paid", "failed"],
      reservation_status: ["pendente", "confirmado", "cancelado", "concluido"],
      subscription_status: ["pending_payment", "active", "expired", "canceled"],
    },
  },
} as const
