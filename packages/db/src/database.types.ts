/**
 * Database types. HAND-WRITTEN PLACEHOLDER matching supabase/migrations/0001 —
 * replaced wholesale by `pnpm --filter @nexlex/db gen:types` once a local/remote
 * Supabase instance is available. Keep the same export shape.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: "student" | "aspirant" | "advocate" | "professor" | "other" | null;
          exam_targets: string[];
          avatar_url: string | null;
          plan: "free" | "plus" | "pro";
          plan_expires_at: string | null;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: "student" | "aspirant" | "advocate" | "professor" | "other" | null;
          exam_targets?: string[];
          avatar_url?: string | null;
          plan?: "free" | "plus" | "pro";
          plan_expires_at?: string | null;
          onboarded_at?: string | null;
        };
        Update: {
          display_name?: string | null;
          role?: "student" | "aspirant" | "advocate" | "professor" | "other" | null;
          exam_targets?: string[];
          avatar_url?: string | null;
          plan?: "free" | "plus" | "pro";
          plan_expires_at?: string | null;
          onboarded_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "student" | "aspirant" | "advocate" | "professor" | "other";
      plan_tier: "free" | "plus" | "pro";
    };
    CompositeTypes: Record<string, never>;
  };
}
