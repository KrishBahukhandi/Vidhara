/**
 * Database types — GENERATED from the live NexLex Supabase project
 * (ref eubyvglzkbzfeznocilg, migrations 0001–0020).
 * Regenerate after schema changes: pnpm --filter @nexlex/db gen:types
 * (needs a Supabase access token with project access; entries below were added
 * by hand for 0009–0015 when the token lacked the types endpoint).
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
          unnumbered: boolean
          act_id: string
          id: string
          kind: string
          number: string
          part_number: string
          part_title: string | null
          sort_order: number
          title: string
        }
        Insert: {
          unnumbered?: boolean
          act_id: string
          id?: string
          kind?: string
          number: string
          part_number?: string | null
          part_title?: string | null
          sort_order: number
          title: string
        }
        Update: {
          unnumbered?: boolean
          act_id?: string
          id?: string
          kind?: string
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
      act_schedule_articles: {
        // A row is LIMBED (rows + the three Limitation columns) or CELLED
        // (cells, one per heading in the schedule's column_labels) — 0026.
        Row: {
          cells: string[] | null
          commencement: string | null
          created_at: string
          description: string | null
          division: string | null
          fts: unknown
          id: string
          number: string
          part_number: string | null
          part_title: string | null
          period: string | null
          rows: Json | null
          schedule_id: string
          sort_key: number
          updated_at: string
        }
        Insert: {
          cells?: string[] | null
          commencement?: string | null
          created_at?: string
          description?: string | null
          division?: string | null
          fts?: unknown
          id?: string
          number: string
          part_number?: string | null
          part_title?: string | null
          period?: string | null
          rows?: Json | null
          schedule_id: string
          sort_key: number
          updated_at?: string
        }
        Update: {
          cells?: string[] | null
          commencement?: string | null
          created_at?: string
          description?: string | null
          division?: string | null
          fts?: unknown
          id?: string
          number?: string
          part_number?: string | null
          part_title?: string | null
          period?: string | null
          rows?: Json | null
          schedule_id?: string
          sort_key?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_schedule_articles_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "act_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      act_orders: {
        Row: {
          act_id: string;
          created_at: string;
          id: string;
          number: string;
          provenance: string | null;
          review_status: string;
          sort_order: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          act_id: string;
          created_at?: string;
          id?: string;
          number: string;
          provenance?: string | null;
          review_status?: string;
          sort_order: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          act_id?: string;
          created_at?: string;
          id?: string;
          number?: string;
          provenance?: string | null;
          review_status?: string;
          sort_order?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      act_order_rules: {
        Row: {
          body_md: string;
          body_plain: string;
          created_at: string;
          id: string;
          marginal_note: string;
          number: string;
          order_id: string;
          sort_key: number;
          updated_at: string;
          version: number;
        };
        Insert: {
          body_md: string;
          body_plain: string;
          created_at?: string;
          id?: string;
          marginal_note: string;
          number: string;
          order_id: string;
          sort_key: number;
          updated_at?: string;
          version?: number;
        };
        Update: {
          body_md?: string;
          body_plain?: string;
          created_at?: string;
          id?: string;
          marginal_note?: string;
          number?: string;
          order_id?: string;
          sort_key?: number;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      act_appendices: {
        Row: {
          act_id: string; created_at: string; id: string; letter: string;
          provenance: string | null; review_status: string; sort_order: number;
          title: string; updated_at: string;
        };
        Insert: {
          act_id: string; created_at?: string; id?: string; letter: string;
          provenance?: string | null; review_status?: string; sort_order: number;
          title: string; updated_at?: string;
        };
        Update: {
          act_id?: string; created_at?: string; id?: string; letter?: string;
          provenance?: string | null; review_status?: string; sort_order?: number;
          title?: string; updated_at?: string;
        };
        Relationships: [];
      };
      act_appendix_forms: {
        Row: {
          appendix_id: string; body_md: string; body_plain: string; created_at: string;
          id: string; number: string; sort_key: number; sort_order: number;
          title: string; updated_at: string; version: number;
        };
        Insert: {
          appendix_id: string; body_md: string; body_plain: string; created_at?: string;
          id?: string; number: string; sort_key: number; sort_order: number;
          title: string; updated_at?: string; version?: number;
        };
        Update: {
          appendix_id?: string; body_md?: string; body_plain?: string; created_at?: string;
          id?: string; number?: string; sort_key?: number; sort_order?: number;
          title?: string; updated_at?: string; version?: number;
        };
        Relationships: [];
      };
      act_schedules: {
        Row: {
          act_id: string
          authority_note: string | null
          column_labels: string[]
          created_at: string
          id: string
          provenance: string | null
          review_status: string
          slug: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          act_id: string
          authority_note?: string | null
          column_labels: string[]
          created_at?: string
          id?: string
          provenance?: string | null
          review_status?: string
          slug: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          act_id?: string
          authority_note?: string | null
          column_labels?: string[]
          created_at?: string
          id?: string
          provenance?: string | null
          review_status?: string
          slug?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_schedules_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "acts"
            referencedColumns: ["id"]
          },
        ]
      }
      act_state_amendments: {
        Row: {
          amendment_text: string
          citation: string
          created_at: string
          id: string
          section_id: string
          sort_order: number
          state: string
          updated_at: string
        }
        Insert: {
          amendment_text: string
          citation: string
          created_at?: string
          id?: string
          section_id: string
          sort_order?: number
          state: string
          updated_at?: string
        }
        Update: {
          amendment_text?: string
          citation?: string
          created_at?: string
          id?: string
          section_id?: string
          sort_order?: number
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_state_amendments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "act_sections"
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
      ai_explanations: {
        Row: {
          created_at: string
          explanation: string
          model: string
          section_id: string
        }
        Insert: {
          created_at?: string
          explanation: string
          model: string
          section_id: string
        }
        Update: {
          created_at?: string
          explanation?: string
          model?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_explanations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "act_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          count: number
          day: string
        }
        Insert: {
          count?: number
          day: string
        }
        Update: {
          count?: number
          day?: string
        }
        Relationships: []
      }
      hearing_reminders: {
        Row: {
          confirm_sent_at: string | null
          confirm_token: string
          confirmed_at: string | null
          created_at: string
          email: string
          hearing_on: string
          id: string
          label: string
          remind_on: string
          sent_at: string | null
          unsubscribe_token: string
        }
        Insert: {
          confirm_sent_at?: string | null
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          hearing_on: string
          id?: string
          label: string
          remind_on: string
          sent_at?: string | null
          unsubscribe_token?: string
        }
        Update: {
          confirm_sent_at?: string | null
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          hearing_on?: string
          id?: string
          label?: string
          remind_on?: string
          sent_at?: string | null
          unsubscribe_token?: string
        }
        Relationships: []
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
          kind: string
          message: string | null
          path: string | null
          platform: string
          score: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          path?: string | null
          platform?: string
          score?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          path?: string | null
          platform?: string
          score?: number | null
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
      v_order_rules: {
        Row: {
          act_abbreviation: string | null;
          act_slug: string | null;
          body_md: string | null;
          body_plain: string | null;
          id: string | null;
          marginal_note: string | null;
          order_id: string | null;
          order_number: string | null;
          order_sort: number | null;
          order_title: string | null;
          rule_number: string | null;
          sort_key: number | null;
        };
        Relationships: [];
      };
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
      search_appendix_forms: {
        Args: { max_results?: number; q: string; scope_act?: string };
        Returns: {
          form_id: string;
          act_abbreviation: string;
          act_slug: string;
          appendix_letter: string;
          appendix_title: string;
          form_number: string;
          form_sort: number;
          title: string;
          snippet: string;
          rank: number;
        }[];
      };
      search_order_rules: {
        Args: { max_results?: number; q: string; scope_act?: string };
        Returns: {
          rule_id: string;
          act_abbreviation: string;
          act_slug: string;
          order_number: string;
          order_title: string;
          order_sort: number;
          rule_number: string;
          marginal_note: string;
          snippet: string;
          rank: number;
        }[];
      };
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
