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
      clientes: {
        Row: {
          cpf: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cpf: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cpf?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      emitentes: {
        Row: {
          cep: string | null
          cert_file_name: string | null
          cert_file_path: string | null
          cert_senha: string | null
          cert_validade: string | null
          cidade: string | null
          cpf_cnpj: string
          created_at: string
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          numero_nota_atual: number
          razao_social: string
          serie: string
          uf: string | null
        }
        Insert: {
          cep?: string | null
          cert_file_name?: string | null
          cert_file_path?: string | null
          cert_senha?: string | null
          cert_validade?: string | null
          cidade?: string | null
          cpf_cnpj: string
          created_at?: string
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          numero_nota_atual?: number
          razao_social: string
          serie?: string
          uf?: string | null
        }
        Update: {
          cep?: string | null
          cert_file_name?: string | null
          cert_file_path?: string | null
          cert_senha?: string | null
          cert_validade?: string | null
          cidade?: string | null
          cpf_cnpj?: string
          created_at?: string
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          numero_nota_atual?: number
          razao_social?: string
          serie?: string
          uf?: string | null
        }
        Relationships: []
      }
      eventos_fiscais: {
        Row: {
          created_at: string
          data_evento: string
          id: string
          justificativa: string
          nota_fiscal_id: string
          protocolo: string | null
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          data_evento?: string
          id?: string
          justificativa: string
          nota_fiscal_id: string
          protocolo?: string | null
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string
          data_evento?: string
          id?: string
          justificativa?: string
          nota_fiscal_id?: string
          protocolo?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_fiscais_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_estaduais: {
        Row: {
          cep: string | null
          cidade: string
          cliente_id: string
          created_at: string
          estado: string
          id: string
          numero: string
          propriedade: string
          uf: string
        }
        Insert: {
          cep?: string | null
          cidade: string
          cliente_id: string
          created_at?: string
          estado: string
          id?: string
          numero: string
          propriedade: string
          uf: string
        }
        Update: {
          cep?: string | null
          cidade?: string
          cliente_id?: string
          created_at?: string
          estado?: string
          id?: string
          numero?: string
          propriedade?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_estaduais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      inutilizacoes: {
        Row: {
          ano: number
          created_at: string
          id: string
          justificativa: string
          numero_final: number
          numero_inicial: number
          protocolo: string | null
          serie: string
          status: string
        }
        Insert: {
          ano?: number
          created_at?: string
          id?: string
          justificativa: string
          numero_final: number
          numero_inicial: number
          protocolo?: string | null
          serie?: string
          status?: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          justificativa?: string
          numero_final?: number
          numero_inicial?: number
          protocolo?: string | null
          serie?: string
          status?: string
        }
        Relationships: []
      }
      mercadorias: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          descricao: string
          especie: string
          id: string
          ncm: string
          unidade: string
          valor_pauta: number
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string
          descricao: string
          especie: string
          id?: string
          ncm: string
          unidade?: string
          valor_pauta?: number
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          descricao?: string
          especie?: string
          id?: string
          ncm?: string
          unidade?: string
          valor_pauta?: number
        }
        Relationships: []
      }
      nfe_itens: {
        Row: {
          codigo_sefaz: string | null
          created_at: string
          descricao: string
          id: string
          lote: string | null
          ncm: string
          nota_fiscal_id: string
          peso: number | null
          quantidade: number
          raca: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo_sefaz?: string | null
          created_at?: string
          descricao: string
          id?: string
          lote?: string | null
          ncm: string
          nota_fiscal_id: string
          peso?: number | null
          quantidade?: number
          raca?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          codigo_sefaz?: string | null
          created_at?: string
          descricao?: string
          id?: string
          lote?: string | null
          ncm?: string
          nota_fiscal_id?: string
          peso?: number | null
          quantidade?: number
          raca?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "nfe_itens_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string
          destinatario_cep: string | null
          destinatario_cidade: string | null
          destinatario_cpf_cnpj: string
          destinatario_endereco: string | null
          destinatario_ie: string | null
          destinatario_propriedade: string | null
          destinatario_razao_social: string
          destinatario_uf: string | null
          emitente_cep: string | null
          emitente_cidade: string | null
          emitente_cpf_cnpj: string
          emitente_endereco: string | null
          emitente_ie: string | null
          emitente_propriedade: string | null
          emitente_razao_social: string
          emitente_uf: string | null
          id: string
          natureza_operacao: string
          numero: string
          observacoes: string | null
          protocolo_autorizacao: string | null
          serie: string
          status: string
          tipo_nota: string
          transportador_cpf_cnpj: string | null
          transportador_nome: string | null
          transportador_placa: string | null
          transportador_rntrc: string | null
          transportador_uf: string | null
          valor_total: number
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string
          destinatario_cep?: string | null
          destinatario_cidade?: string | null
          destinatario_cpf_cnpj: string
          destinatario_endereco?: string | null
          destinatario_ie?: string | null
          destinatario_propriedade?: string | null
          destinatario_razao_social: string
          destinatario_uf?: string | null
          emitente_cep?: string | null
          emitente_cidade?: string | null
          emitente_cpf_cnpj: string
          emitente_endereco?: string | null
          emitente_ie?: string | null
          emitente_propriedade?: string | null
          emitente_razao_social: string
          emitente_uf?: string | null
          id?: string
          natureza_operacao: string
          numero: string
          observacoes?: string | null
          protocolo_autorizacao?: string | null
          serie?: string
          status?: string
          tipo_nota?: string
          transportador_cpf_cnpj?: string | null
          transportador_nome?: string | null
          transportador_placa?: string | null
          transportador_rntrc?: string | null
          transportador_uf?: string | null
          valor_total?: number
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string
          destinatario_cep?: string | null
          destinatario_cidade?: string | null
          destinatario_cpf_cnpj?: string
          destinatario_endereco?: string | null
          destinatario_ie?: string | null
          destinatario_propriedade?: string | null
          destinatario_razao_social?: string
          destinatario_uf?: string | null
          emitente_cep?: string | null
          emitente_cidade?: string | null
          emitente_cpf_cnpj?: string
          emitente_endereco?: string | null
          emitente_ie?: string | null
          emitente_propriedade?: string | null
          emitente_razao_social?: string
          emitente_uf?: string | null
          id?: string
          natureza_operacao?: string
          numero?: string
          observacoes?: string | null
          protocolo_autorizacao?: string | null
          serie?: string
          status?: string
          tipo_nota?: string
          transportador_cpf_cnpj?: string | null
          transportador_nome?: string | null
          transportador_placa?: string | null
          transportador_rntrc?: string | null
          transportador_uf?: string | null
          valor_total?: number
        }
        Relationships: []
      }
      transportadoras: {
        Row: {
          cpf_cnpj: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cpf_cnpj: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cpf_cnpj?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          created_at: string
          id: string
          placa: string
          rntrc: string | null
          transportadora_id: string
          uf_placa: string
        }
        Insert: {
          created_at?: string
          id?: string
          placa: string
          rntrc?: string | null
          transportadora_id: string
          uf_placa: string
        }
        Update: {
          created_at?: string
          id?: string
          placa?: string
          rntrc?: string | null
          transportadora_id?: string
          uf_placa?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
