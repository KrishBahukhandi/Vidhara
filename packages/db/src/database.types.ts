/**
 * Database types — GENERATED from the live NexLex Supabase project
 * (ref eubyvglzkbzfeznocilg, migrations 0001–0005).
 * Regenerate after schema changes: pnpm --filter @nexlex/db gen:types
 */
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
      act_chapters: {
        Row: {
          act_id: string
          id: string
          number: string
          part_number: string | null
          part_title: string | null
          sort_order: number
          title: string
        }
        Insert: {
          act_id: string
          id?: string
          number: string
          part_number?: string | null
          part_title?: string | null
          sort_order: number
          title: string
        }
        Update: {
          act_id?: string
          id?: string
          number?: string
          part_number?: string | null
          part_title?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_chapters_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "acts"
            referencedColumns: ["id"]
          },
        ]
      }
      act_sections: {
        Row: {
          act_id: string
          body_md: string
          body_plain: string
          chapter_id: string | null
          created_at: string
          effective_from: string | null
          fts: unknown
          id: string
          is_repealed: boolean
          marginal_note: string
          number: string
          provenance: string | null
          review_status: string
          sort_key: number
          updated_at: string
          version: number
        }
        Insert: {
          act_id: string
          body_md: string
          body_plain: string
          chapter_id?: string | null
          created_at?: string
          effective_from?: string | null
          fts?: unknown
          id?: string
          is_repealed?: boolean
          marginal_note: string
          number: string
          provenance?: string | null
          review_status?: string
          sort_key: number
          updated_at?: string
          version?: number
        }
        Update: {
          act_id?: string
          body_md?: string
          body_plain?: string
          chapter_id?: string | null
          created_at?: string
          effective_from?: string | null
          fts?: unknown
          id?: string
          is_repealed?: boolean
          marginal_note?: string
          number?: string
          provenance?: string | null
          review_status?: string
          sort_key?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "act_sections_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "acts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "act_sections_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "act_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      acts: {
        Row: {
          abbreviation: string
          category: string
          created_at: string
          enactment_date: string | null
          enforcement_date: string | null
          id: string
          published_at: string | null
          replaced_by_act_id: string | null
          short_title: string | null
          slug: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
          version: number
          year: number
        }
        Insert: {
          abbreviation: string
          category?: string
          created_at?: string
          enactment_date?: string | null
          enforcement_date?: string | null
          id?: string
          published_at?: string | null
          replaced_by_act_id?: string | null
          short_title?: string | null
          slug: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
          version?: number
          year: number
        }
        Update: {
          abbreviation?: string
          category?: string
          created_at?: string
          enactment_date?: string | null
          enforcement_date?: string | null
          id?: string
          published_at?: string | null
          replaced_by_act_id?: string | null
          short_title?: string | null
          slug?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "acts_replaced_by_act_id_fkey"
            columns: ["replaced_by_act_id"]
            isOneToOne: false
            referencedRelation: "acts"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string | null
          path: string | null
          platform: string
          score: number
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          path?: string | null
          platform?: string
          score: number
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          path?: string | null
          platform?: string
          score?: number
        }
        Relationships: []
      }
      law_mappings: {
        Row: {
          change_summary_md: string | null
          created_at: string
          id: string
          mapping_type: string
          provenance: string | null
          review_status: string
          reviewed_by: string | null
          source_section_id: string | null
          target_section_id: string | null
        }
        Insert: {
          change_summary_md?: string | null
          created_at?: string
          id?: string
          mapping_type: string
          provenance?: string | null
          review_status?: string
          reviewed_by?: string | null
          source_section_id?: string | null
          target_section_id?: string | null
        }
        Update: {
          change_summary_md?: string | null
          created_at?: string
          id?: string
          mapping_type?: string
          provenance?: string | null
          review_status?: string
          reviewed_by?: string | null
          source_section_id?: string | null
          target_section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "law_mappings_source_section_id_fkey"
            columns: ["source_section_id"]
            isOneToOne: false
            referencedRelation: "act_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "law_mappings_source_section_id_fkey"
            columns: ["source_section_id"]
            isOneToOne: false
            referencedRelation: "v_mapping_lookup"
            referencedColumns: ["source_section_id"]
          },
          {
            foreignKeyName: "law_mappings_source_section_id_fkey"
            columns: ["source_section_id"]
            isOneToOne: false
            referencedRelation: "v_mapping_lookup"
            referencedColumns: ["target_section_id"]
          },
          {
            foreignKeyName: "law_mappings_target_section_id_fkey"
            columns: ["target_section_id"]
            isOneToOne: false
            referencedRelation: "act_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "law_mappings_target_section_id_fkey"
            columns: ["target_section_id"]
            isOneToOne: false
            referencedRelation: "v_mapping_lookup"
            referencedColumns: ["source_section_id"]
          },
          {
            foreignKeyName: "law_mappings_target_section_id_fkey"
            columns: ["target_section_id"]
            isOneToOne: false
            referencedRelation: "v_mapping_lookup"
            referencedColumns: ["target_section_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          exam_targets: string[]
          id: string
          onboarded_at: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_targets?: string[]
          id: string
          onboarded_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_targets?: string[]
          id?: string
          onboarded_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_mapping_lookup: {
        Row: {
          change_summary_md: string | null
          mapping_id: string | null
          mapping_type: string | null
          source_act: string | null
          source_act_slug: string | null
          source_marginal_note: string | null
          source_number: string | null
          source_section_id: string | null
          target_act: string | null
          target_act_slug: string | null
          target_marginal_note: string | null
          target_number: string | null
          target_section_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      search_sections: {
        Args: { max_results?: number; q: string; scope_act?: string }
        Returns: {
          act_abbreviation: string
          act_slug: string
          marginal_note: string
          number: string
          rank: number
          section_id: string
          snippet: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      plan_tier: "free" | "plus" | "pro"
      user_role: "student" | "aspirant" | "advocate" | "professor" | "other"
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
      plan_tier: ["free", "plus", "pro"],
      user_role: ["student", "aspirant", "advocate", "professor", "other"],
    },
  },
} as const
