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
      ai_usage_logs: {
        Row: {
          context: string | null
          created_at: string | null
          details: Json | null
          id: string
          model_name: string | null
          operation_type: string
          tokens_input: number | null
          tokens_output: number | null
          total_tokens: number | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          model_name?: string | null
          operation_type: string
          tokens_input?: number | null
          tokens_output?: number | null
          total_tokens?: number | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          model_name?: string | null
          operation_type?: string
          tokens_input?: number | null
          tokens_output?: number | null
          total_tokens?: number | null
        }
        Relationships: []
      }
      embedding_regeneration_jobs: {
        Row: {
          created_at: string | null
          current_enrichment: Json | null
          current_group_id: string | null
          current_group_name: string | null
          embedding_model: string
          enrichment_model: string
          error_message: string | null
          failed_groups: Json | null
          id: string
          processed_groups: number | null
          status: string
          total_groups: number
          total_tokens: number | null
          updated_at: string | null
          use_sample_groups: boolean | null
        }
        Insert: {
          created_at?: string | null
          current_enrichment?: Json | null
          current_group_id?: string | null
          current_group_name?: string | null
          embedding_model: string
          enrichment_model: string
          error_message?: string | null
          failed_groups?: Json | null
          id?: string
          processed_groups?: number | null
          status?: string
          total_groups: number
          total_tokens?: number | null
          updated_at?: string | null
          use_sample_groups?: boolean | null
        }
        Update: {
          created_at?: string | null
          current_enrichment?: Json | null
          current_group_id?: string | null
          current_group_name?: string | null
          embedding_model?: string
          enrichment_model?: string
          error_message?: string | null
          failed_groups?: Json | null
          id?: string
          processed_groups?: number | null
          status?: string
          total_groups?: number
          total_tokens?: number | null
          updated_at?: string | null
          use_sample_groups?: boolean | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          embedding_context: string | null
          embedding_identity: string | null
          embedding_physical: string | null
          icon: string | null
          id: string
          location_id: string | null
          name: string
          performance_id: string | null
          short_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding_context?: string | null
          embedding_identity?: string | null
          embedding_physical?: string | null
          icon?: string | null
          id?: string
          location_id?: string | null
          name: string
          performance_id?: string | null
          short_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding_context?: string | null
          embedding_identity?: string | null
          embedding_physical?: string | null
          icon?: string | null
          id?: string
          location_id?: string | null
          name?: string
          performance_id?: string | null
          short_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_classification_logs: {
        Row: {
          created_at: string | null
          id: string
          identity_score: number
          latency_ms: number | null
          model_name: string | null
          physical_score: number
          query: string
          source: string
          tokens: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          identity_score: number
          latency_ms?: number | null
          model_name?: string | null
          physical_score: number
          query: string
          source?: string
          tokens: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          identity_score?: number
          latency_ms?: number | null
          model_name?: string | null
          physical_score?: number
          query?: string
          source?: string
          tokens?: string[]
        }
        Relationships: []
      }
      intent_classification_stats: {
        Row: {
          avg_latency_ms: number | null
          date: string
          id: string
          llm_fallback_count: number | null
          rule_based_count: number | null
          total_classifications: number | null
          total_cost_usd: number | null
          updated_at: string | null
        }
        Insert: {
          avg_latency_ms?: number | null
          date?: string
          id?: string
          llm_fallback_count?: number | null
          rule_based_count?: number | null
          total_classifications?: number | null
          total_cost_usd?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_latency_ms?: number | null
          date?: string
          id?: string
          llm_fallback_count?: number | null
          rule_based_count?: number | null
          total_classifications?: number | null
          total_cost_usd?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      intent_keywords: {
        Row: {
          confidence: number
          created_at: string | null
          id: string
          identity_weight: number
          keyword: string
          physical_weight: number
          source: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string | null
          id?: string
          identity_weight?: number
          keyword: string
          physical_weight?: number
          source?: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          id?: string
          identity_weight?: number
          keyword?: string
          physical_weight?: number
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          belongs_to: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          embedding: string | null
          id: string
          map_image_url: string | null
          name: string
          type: Database["public"]["Enums"]["location_type_enum"]
        }
        Insert: {
          belongs_to?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          map_image_url?: string | null
          name: string
          type?: Database["public"]["Enums"]["location_type_enum"]
        }
        Update: {
          belongs_to?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          map_image_url?: string | null
          name?: string
          type?: Database["public"]["Enums"]["location_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "locations_belongs_to_fkey"
            columns: ["belongs_to"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      note_mentions: {
        Row: {
          created_at: string | null
          id: string
          mention_label: string | null
          mention_type: Database["public"]["Enums"]["mention_type"]
          mentioned_id: string | null
          note_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mention_label?: string | null
          mention_type: Database["public"]["Enums"]["mention_type"]
          mentioned_id?: string | null
          note_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mention_label?: string | null
          mention_type?: Database["public"]["Enums"]["mention_type"]
          mentioned_id?: string | null
          note_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: Json | null
          created_at: string | null
          created_by: string | null
          embedding: string | null
          id: string
          is_master: boolean | null
          performance_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_master?: boolean | null
          performance_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          is_master?: boolean | null
          performance_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_props: {
        Row: {
          created_at: string | null
          id: string
          is_checked: boolean | null
          item_name: string
          order: number | null
          performance_id: string
          scene_name: string | null
          scene_number: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          item_name: string
          order?: number | null
          performance_id: string
          scene_name?: string | null
          scene_number?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_checked?: boolean | null
          item_name?: string
          order?: number | null
          performance_id?: string
          scene_name?: string | null
          scene_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_props_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      performances: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          embedding: string | null
          id: string
          image_url: string | null
          last_show_date: string | null
          notes: string | null
          premiere_date: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["performance_status_enum"]
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          last_show_date?: string | null
          notes?: string | null
          premiere_date?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["performance_status_enum"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          last_show_date?: string | null
          notes?: string | null
          premiere_date?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["performance_status_enum"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          access_level: string | null
          active: boolean | null
          batch_group: string | null
          clicks: number | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          target_url: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          active?: boolean | null
          batch_group?: string | null
          clicks?: number | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          target_url: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          active?: boolean | null
          batch_group?: string | null
          clicks?: number | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          target_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scene_checklist_items: {
        Row: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          id: string
          is_on_stage: boolean | null
          is_prepared: boolean | null
          item_image_url_snapshot: string | null
          item_name_snapshot: string | null
          live_notes: string | null
          performance_prop_id: string | null
          scene_checklist_id: string
        }
        Insert: {
          assigned_to?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          is_on_stage?: boolean | null
          is_prepared?: boolean | null
          item_image_url_snapshot?: string | null
          item_name_snapshot?: string | null
          live_notes?: string | null
          performance_prop_id?: string | null
          scene_checklist_id: string
        }
        Update: {
          assigned_to?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          is_on_stage?: boolean | null
          is_prepared?: boolean | null
          item_image_url_snapshot?: string | null
          item_name_snapshot?: string | null
          live_notes?: string | null
          performance_prop_id?: string | null
          scene_checklist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_checklist_items_performance_prop_id_fkey"
            columns: ["performance_prop_id"]
            isOneToOne: false
            referencedRelation: "performance_props"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_checklist_items_scene_checklist_id_fkey"
            columns: ["scene_checklist_id"]
            isOneToOne: false
            referencedRelation: "scene_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_checklists: {
        Row: {
          cast: string | null
          checklist_state: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_heartbeat: string | null
          performance_id: string
          scene_name: string | null
          scene_number: string
          show_date: string
          type: string
        }
        Insert: {
          cast?: string | null
          checklist_state?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          performance_id: string
          scene_name?: string | null
          scene_number: string
          show_date: string
          type?: string
        }
        Update: {
          cast?: string | null
          checklist_state?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_heartbeat?: string | null
          performance_id?: string
          scene_name?: string | null
          scene_number?: string
          show_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_checklists_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_tasks: {
        Row: {
          assigned_to: string | null
          content: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          live_notes: string | null
          order_index: number
          scene_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          live_notes?: string | null
          order_index?: number
          scene_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          live_notes?: string | null
          order_index?: number
          scene_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scene_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_tasks_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          act_number: number | null
          created_at: string | null
          id: string
          name: string | null
          performance_id: string
          scene_number: number
        }
        Insert: {
          act_number?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          performance_id: string
          scene_number: number
        }
        Update: {
          act_number?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          performance_id?: string
          scene_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenes_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_searchable_entities: {
        Row: {
          description: string | null
          embedding_context: string | null
          embedding_identity: string | null
          embedding_physical: string | null
          entity_type: string | null
          id: string | null
          image_url: string | null
          metadata: Json | null
          name: string | null
          updated_at: string | null
          url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      binary_quantize:
      | {
        Args: {
          "": string
        }
        Returns: unknown
      }
      | {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
      | {
        Args: {
          "": unknown
        }
        Returns: number
      }
      | {
        Args: {
          "": unknown
        }
        Returns: number
      }
      l2_normalize:
      | {
        Args: {
          "": string
        }
        Returns: string
      }
      | {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      | {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      match_groups: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          name: string
          description: string
          similarity: number
        }[]
      }
      match_locations: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          name: string
          description: string
          similarity: number
        }[]
      }
      match_notes: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          content: Json
          similarity: number
        }[]
      }
      match_performances: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          title: string
          notes: string
          similarity: number
        }[]
      }
      search_global: {
        Args: {
          query_text: string
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          entity_type: string
          id: string
          name: string
          description: string
          url: string
          image_url: string
          metadata: Json
          similarity: number
        }[]
      }
      search_global_hybrid: {
        Args: {
          query_text: string
          query_embedding: string
          match_threshold?: number
          match_count?: number
          full_text_weight?: number
          semantic_weight?: number
        }
        Returns: {
          entity_type: string
          id: string
          name: string
          description: string
          url: string
          image_url: string
          metadata: Json
          score: number
          match_type: string
        }[]
      }
      search_global_hybrid_mv: {
        Args: {
          query_text: string
          query_embedding: string
          weight_identity?: number
          weight_physical?: number
          weight_context?: number
          match_threshold?: number
          match_count?: number
          fuzzy_threshold?: number
        }
        Returns: {
          entity_type: string
          id: string
          name: string
          description: string
          url: string
          image_url: string
          metadata: Json
          score: number
          match_type: string
        }[]
      }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
      | {
        Args: {
          "": string
        }
        Returns: number
      }
      | {
        Args: {
          "": unknown
        }
        Returns: number
      }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      item_performance_status_enum: [
        "active",
        "upcoming",
        "archived",
        "unassigned",
        "in_maintenance"
      ]
      item_status_enum: ["draft", "active"]
      location_type_enum: ["main_storage", "backstage", "stage", "other"]
      mention_type: ["item", "category", "location", "user", "date"]
      performance_status_enum: ["active", "upcoming", "archived"]
      user_role: ["admin", "user", "manager"]
      user_status: ["pending", "approved", "rejected"]
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Omit<Database, "__InternalSupabase"> },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Omit<Database, "__InternalSupabase"> },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Omit<Database, "__InternalSupabase"> },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Omit<Database, "__InternalSupabase"> },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Omit<Database, "__InternalSupabase"> },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Omit<Database, "__InternalSupabase">
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
