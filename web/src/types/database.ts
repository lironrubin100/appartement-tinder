/* Database types synchronized with the local Supabase schema.
 * The connected project is inactive, so types are updated locally until a
 * migration can be applied and types regenerated from the live schema.
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      apartment_interests: {
        Row: {
          apartment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          apartment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          apartment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_interests_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartment_stats"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "apartment_interests_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_reports: {
        Row: {
          apartment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          apartment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          apartment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_reports_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartment_stats"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "apartment_reports_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartments: {
        Row: {
          address: string | null
          available_from: string | null
          bedrooms: number
          contact_url: string | null
          created_at: string
          description: string | null
          id: string
          is_sublet: boolean
          lat: number
          lister_id: string | null
          lng: number
          photos: string[]
          price: number
          source: string
          status: string
          title: string
        }
        Insert: {
          address?: string | null
          available_from?: string | null
          bedrooms: number
          contact_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sublet?: boolean
          lat: number
          lister_id?: string | null
          lng: number
          photos?: string[]
          price: number
          source?: string
          status?: string
          title: string
        }
        Update: {
          address?: string | null
          available_from?: string | null
          bedrooms?: number
          contact_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_sublet?: boolean
          lat?: number
          lister_id?: string | null
          lng?: number
          photos?: string[]
          price?: number
          source?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartments_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          admin_id: string
          apartment_id: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          id: string
          name: string | null
          status: string
        }
        Insert: {
          admin_id: string
          apartment_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          name?: string | null
          status?: string
        }
        Update: {
          admin_id?: string
          apartment_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartment_stats"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "groups_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          from_user: string
          id: string
          message: string
          ref_tag: string | null
          to_group: string | null
          to_user: string | null
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          message: string
          ref_tag?: string | null
          to_group?: string | null
          to_user?: string | null
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          message?: string
          ref_tag?: string | null
          to_group?: string | null
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_to_group_fkey"
            columns: ["to_group"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          profile_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          profile_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          profile_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          agency_name: string | null
          birth_date: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          move_in_date: string | null
          phone: string | null
          profile_id: string
          student_email: string | null
          student_email_verified_at: string | null
          updated_at: string
        }
        Insert: {
          agency_name?: string | null
          birth_date?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          move_in_date?: string | null
          phone?: string | null
          profile_id: string
          student_email?: string | null
          student_email_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          agency_name?: string | null
          birth_date?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          move_in_date?: string | null
          phone?: string | null
          profile_id?: string
          student_email?: string | null
          student_email_verified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          cleanliness: string | null
          climate: string | null
          cooking_dynamics: string | null
          created_at: string
          default_home: string
          financial_splitting: string | null
          gender: string | null
          gender_dynamic: string | null
          id: string
          is_pro: boolean
          is_verified: boolean
          kitchen_dietary: string | null
          last_active_at: string
          miluim_reserve_duty: string | null
          mode: string
          music_vibe: string | null
          name: string
          noise_tolerance: string | null
          notifications_enabled: boolean
          onboarded: boolean
          pets: string | null
          photo_blur_url: string | null
          photo_url: string | null
          public_badges: string[]
          relationship_status: string | null
          sleep_schedule: string | null
          smoking: string | null
          social_guests: string | null
          study_habits: string | null
          weekend_routine: string | null
        }
        Insert: {
          bio?: string | null
          cleanliness?: string | null
          climate?: string | null
          cooking_dynamics?: string | null
          created_at?: string
          default_home?: string
          financial_splitting?: string | null
          gender?: string | null
          gender_dynamic?: string | null
          id: string
          is_pro?: boolean
          is_verified?: boolean
          kitchen_dietary?: string | null
          last_active_at?: string
          miluim_reserve_duty?: string | null
          mode?: string
          music_vibe?: string | null
          name: string
          noise_tolerance?: string | null
          notifications_enabled?: boolean
          onboarded?: boolean
          pets?: string | null
          photo_blur_url?: string | null
          photo_url?: string | null
          public_badges?: string[]
          relationship_status?: string | null
          sleep_schedule?: string | null
          smoking?: string | null
          social_guests?: string | null
          study_habits?: string | null
          weekend_routine?: string | null
        }
        Update: {
          bio?: string | null
          cleanliness?: string | null
          climate?: string | null
          cooking_dynamics?: string | null
          created_at?: string
          default_home?: string
          financial_splitting?: string | null
          gender?: string | null
          gender_dynamic?: string | null
          id?: string
          is_pro?: boolean
          is_verified?: boolean
          kitchen_dietary?: string | null
          last_active_at?: string
          miluim_reserve_duty?: string | null
          mode?: string
          music_vibe?: string | null
          name?: string
          noise_tolerance?: string | null
          notifications_enabled?: boolean
          onboarded?: boolean
          pets?: string | null
          photo_blur_url?: string | null
          photo_url?: string | null
          public_badges?: string[]
          relationship_status?: string | null
          sleep_schedule?: string | null
          smoking?: string | null
          social_guests?: string | null
          study_habits?: string | null
          weekend_routine?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          token: string
          user_id: string
        }
        Insert: {
          token: string
          user_id: string
        }
        Update: {
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          apartment_id: string
          created_at: string
          group_id: string | null
          user_id: string
        }
        Insert: {
          apartment_id: string
          created_at?: string
          group_id?: string | null
          user_id: string
        }
        Update: {
          apartment_id?: string
          created_at?: string
          group_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartment_stats"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "saves_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_public: {
        Row: {
          age: number | null
          bio: string | null
          cleanliness: string | null
          climate: string | null
          cooking_dynamics: string | null
          financial_splitting: string | null
          gender: string | null
          gender_dynamic: string | null
          id: string | null
          kitchen_dietary: string | null
          miluim_reserve_duty: string | null
          music_vibe: string | null
          name: string | null
          noise_tolerance: string | null
          pets: string | null
          photo_url: string | null
          public_badges: string[] | null
          relationship_status: string | null
          sleep_schedule: string | null
          smoking: string | null
          social_guests: string | null
          study_habits: string | null
          weekend_routine: string | null
        }
        Relationships: []
      }
      apartment_hype_faces: {
        Row: {
          apartment_id: string | null
          name: string | null
          photo_url: string | null
          unblurred: boolean | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apartment_interests_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartment_stats"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "apartment_interests_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_stats: {
        Row: {
          apartment_id: string | null
          interest_count: number | null
          report_count: number | null
        }
        Insert: {
          apartment_id?: string | null
          interest_count?: never
          report_count?: never
        }
        Update: {
          apartment_id?: string | null
          interest_count?: never
          report_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      accept_like: { Args: { p_like_id: string }; Returns: string }
      am_pro: { Args: never; Returns: boolean }
      blocked_with: { Args: { other: string }; Returns: boolean }
      is_conversation_member: { Args: { cid: string }; Returns: boolean }
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
