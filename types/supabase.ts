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
      groups: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          location_id: string | null
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          location_id?: string | null
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          location_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          ai_description: string | null
          attributes: Json | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          embedding: string | null
          group_id: string | null
          id: string
          image_url: string | null
          last_modified_by: string | null
          location_id: string | null
          name: string
          notes: string | null
          performance_status: Database["public"]["Enums"]["item_performance_status_enum"]
          status: Database["public"]["Enums"]["item_status_enum"]
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          ai_description?: string | null
          attributes?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          embedding?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          last_modified_by?: string | null
          location_id?: string | null
          name: string
          notes?: string | null
          performance_status?: Database["public"]["Enums"]["item_performance_status_enum"]
          status?: Database["public"]["Enums"]["item_status_enum"]
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_description?: string | null
          attributes?: Json | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          embedding?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          last_modified_by?: string | null
          location_id?: string | null
          name?: string
          notes?: string | null
          performance_status?: Database["public"]["Enums"]["item_performance_status_enum"]
          status?: Database["public"]["Enums"]["item_status_enum"]
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          belongs_to: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["location_type_enum"]
        }
        Insert: {
          belongs_to?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["location_type_enum"]
        }
        Update: {
          belongs_to?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
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
          id: string
          performance_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          performance_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
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
          {
            foreignKeyName: "notes_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "vw_active_performances"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_items: {
        Row: {
          created_at: string | null
          id: string
          image_url_snapshot: string | null
          item_id: string
          item_name_snapshot: string | null
          location_snapshot: string | null
          notes_snapshot: string | null
          performance_id: string
          scene_name: string | null
          scene_number: string | null
          setup_instructions: string | null
          updated_at: string | null
          usage_notes: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url_snapshot?: string | null
          item_id: string
          item_name_snapshot?: string | null
          location_snapshot?: string | null
          notes_snapshot?: string | null
          performance_id: string
          scene_name?: string | null
          scene_number?: string | null
          setup_instructions?: string | null
          updated_at?: string | null
          usage_notes?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url_snapshot?: string | null
          item_id?: string
          item_name_snapshot?: string | null
          location_snapshot?: string | null
          notes_snapshot?: string | null
          performance_id?: string
          scene_name?: string | null
          scene_number?: string | null
          setup_instructions?: string | null
          updated_at?: string | null
          usage_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "vw_active_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "vw_items_by_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_items_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "performances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_items_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "vw_active_performances"
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
          id: string
          image_url: string | null
          last_show_date: string | null
          notes: string | null
          premiere_date: string | null
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
          id?: string
          image_url?: string | null
          last_show_date?: string | null
          notes?: string | null
          premiere_date?: string | null
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
          id?: string
          image_url?: string | null
          last_show_date?: string | null
          notes?: string | null
          premiere_date?: string | null
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
      scene_checklist_items: {
        Row: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          id: string
          is_on_stage: boolean | null
          is_prepared: boolean | null
          item_id: string
          live_notes: string | null
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
          item_id: string
          live_notes?: string | null
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
          item_id?: string
          live_notes?: string | null
          scene_checklist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_checklist_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_checklist_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "vw_active_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_checklist_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "vw_items_by_location"
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
          created_at: string | null
          id: string
          is_active: boolean | null
          performance_id: string
          scene_name: string | null
          scene_number: string
          show_date: string
          type: string
        }
        Insert: {
          cast?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          performance_id: string
          scene_name?: string | null
          scene_number: string
          show_date: string
          type?: string
        }
        Update: {
          cast?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
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
          {
            foreignKeyName: "scene_checklists_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "vw_active_performances"
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
          {
            foreignKeyName: "scenes_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "vw_active_performances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_active_items: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          group_id: string | null
          id: string | null
          image_url: string | null
          last_modified_by: string | null
          location_id: string | null
          name: string | null
          notes: string | null
          performance_status:
            | Database["public"]["Enums"]["item_performance_status_enum"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          group_id?: string | null
          id?: string | null
          image_url?: string | null
          last_modified_by?: string | null
          location_id?: string | null
          name?: string | null
          notes?: string | null
          performance_status?:
            | Database["public"]["Enums"]["item_performance_status_enum"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          group_id?: string | null
          id?: string | null
          image_url?: string | null
          last_modified_by?: string | null
          location_id?: string | null
          name?: string | null
          notes?: string | null
          performance_status?:
            | Database["public"]["Enums"]["item_performance_status_enum"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_active_performances: {
        Row: {
          created_at: string | null
          id: string | null
          items_count: number | null
          last_show_date: string | null
          notes: string | null
          premiere_date: string | null
          status: Database["public"]["Enums"]["performance_status_enum"] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      vw_items_by_location: {
        Row: {
          group_name: string | null
          id: string | null
          item_name: string | null
          location_name: string | null
          location_type:
            | Database["public"]["Enums"]["location_type_enum"]
            | null
          performance_status:
            | Database["public"]["Enums"]["item_performance_status_enum"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_storage_stats: {
        Args: never
        Returns: {
          category: string
          label: string
          size_bytes: number
        }[]
      }
      match_items: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          group_id: string
          id: string
          image_url: string
          location_id: string
          name: string
          similarity: number
        }[]
      }
      soft_delete_item: { Args: { item_uuid: string }; Returns: undefined }
    }
    Enums: {
      item_performance_status_enum:
        | "active"
        | "upcoming"
        | "archived"
        | "unassigned"
        | "in_maintenance"
      item_status_enum: "draft" | "active"
      location_type_enum: "main_storage" | "backstage" | "stage" | "other"
      mention_type: "item" | "category" | "location" | "user" | "date"
      performance_status_enum: "active" | "upcoming" | "archived"
      user_role: "admin" | "user" | "manager"
      user_status: "pending" | "approved" | "rejected"
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
      item_performance_status_enum: [
        "active",
        "upcoming",
        "archived",
        "unassigned",
        "in_maintenance",
      ],
      item_status_enum: ["draft", "active"],
      location_type_enum: ["main_storage", "backstage", "stage", "other"],
      mention_type: ["item", "category", "location", "user", "date"],
      performance_status_enum: ["active", "upcoming", "archived"],
      user_role: ["admin", "user", "manager"],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const
