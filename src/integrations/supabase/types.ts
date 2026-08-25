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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      commitments: {
        Row: {
          action_type: string
          connection_id: string
          created_at: string
          description: string
          follow_up_date: string | null
          id: string
          partner_rsvp: string | null
          rsvp: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          connection_id: string
          created_at?: string
          description?: string
          follow_up_date?: string | null
          id?: string
          partner_rsvp?: string | null
          rsvp?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          connection_id?: string
          created_at?: string
          description?: string
          follow_up_date?: string | null
          id?: string
          partner_rsvp?: string | null
          rsvp?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
          match_reason: string
          match_score: number
          status: string
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_reason?: string
          match_score?: number
          status?: string
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          match_reason?: string
          match_score?: number
          status?: string
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      data_backups: {
        Row: {
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          created_at: string
          description: string
          id: string
          issues: string[]
          owner_id: string | null
          region: string
          resources_have: string[]
          resources_need: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          issues?: string[]
          owner_id?: string | null
          region?: string
          resources_have?: string[]
          resources_need?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          issues?: string[]
          owner_id?: string | null
          region?: string
          resources_have?: string[]
          resources_need?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          connection_id: string
          created_at: string
          from_id: string | null
          id: string
          text: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          from_id?: string | null
          id?: string
          text: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          from_id?: string | null
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          avatar: string
          bio: string
          created_at: string
          device_id: string | null
          generation: string
          id: string
          interests: string[]
          linked_at: string | null
          linked_email: string | null
          linked_user_id: string | null
          name: string
          organization: string
          photo: string | null
          powers_have: string[]
          powers_need: string[]
          province: string
          region: string
          source: string
          updated_at: string
        }
        Insert: {
          avatar?: string
          bio?: string
          created_at?: string
          device_id?: string | null
          generation?: string
          id?: string
          interests?: string[]
          linked_at?: string | null
          linked_email?: string | null
          linked_user_id?: string | null
          name: string
          organization?: string
          photo?: string | null
          powers_have?: string[]
          powers_need?: string[]
          province?: string
          region?: string
          source?: string
          updated_at?: string
        }
        Update: {
          avatar?: string
          bio?: string
          created_at?: string
          device_id?: string | null
          generation?: string
          id?: string
          interests?: string[]
          linked_at?: string | null
          linked_email?: string | null
          linked_user_id?: string | null
          name?: string
          organization?: string
          photo?: string | null
          powers_have?: string[]
          powers_need?: string[]
          province?: string
          region?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      province_notes: {
        Row: {
          author_id: string | null
          author_name: string
          created_at: string
          detail: string
          id: string
          issues: string[]
          province: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          created_at?: string
          detail?: string
          id?: string
          issues?: string[]
          province: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          created_at?: string
          detail?: string
          id?: string
          issues?: string[]
          province?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "province_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          batch: string
          course: string
          created_at: string
          device_id: string | null
          highlight: string
          id: string
          name: string
          photo: string | null
          policy_issues: string[]
          province: string
          region: string
          showcase: boolean
          stage_ready: boolean
          summary: string
          updated_at: string
          wanted: string
        }
        Insert: {
          batch?: string
          course?: string
          created_at?: string
          device_id?: string | null
          highlight?: string
          id?: string
          name: string
          photo?: string | null
          policy_issues?: string[]
          province?: string
          region?: string
          showcase?: boolean
          stage_ready?: boolean
          summary?: string
          updated_at?: string
          wanted?: string
        }
        Update: {
          batch?: string
          course?: string
          created_at?: string
          device_id?: string | null
          highlight?: string
          id?: string
          name?: string
          photo?: string | null
          policy_issues?: string[]
          province?: string
          region?: string
          showcase?: boolean
          stage_ready?: boolean
          summary?: string
          updated_at?: string
          wanted?: string
        }
        Relationships: []
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
