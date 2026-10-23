// Generated from Supabase; local refinements: server-issued message sequence, nullable RPC targets/cursor, non-null apartment projection fields.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15';
  };
  public: {
    Tables: {
      listing_drafts: {
        Row: { id: string; owner_id: string; schema_version: number; revision: number; created_at: string; updated_at: string; state: string; source_listing_id: string | null; source_revision: number | null; fields: Json; photos: Json; publication_request_id: string; import_receipt_id: string | null; publication_started_at: string | null; publication_payload_hash: string | null };
        Insert: { id?: string; fields?: Json; source_listing_id?: string | null; source_revision?: number | null };
        Update: never;
        Relationships: [];
      };
      profile_lifestyle: {
        Row: { profile_id: string; taxonomy_version: number; facts: Json; disclosed_fields: string[]; revision: number; updated_at: string };
        Insert: { profile_id: string; taxonomy_version?: number; facts?: Json; disclosed_fields?: string[]; revision?: number; updated_at?: string };
        Update: { facts?: Json; disclosed_fields?: string[]; revision?: number; updated_at?: string };
        Relationships: [];
      };
      profile_lifestyle_private: {
        Row: { profile_id: string; preferences: Json; updated_at: string };
        Insert: { profile_id: string; preferences?: Json; updated_at?: string };
        Update: { preferences?: Json; updated_at?: string };
        Relationships: [];
      };
      apartment_interests: {
        Row: {
          apartment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          apartment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          apartment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartment_stats';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'listing_address_access';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'apartment_interests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_interests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      apartment_reports: {
        Row: {
          apartment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          apartment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          apartment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'apartment_reports_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartment_stats';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'apartment_reports_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_reports_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_reports_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'listing_address_access';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'apartment_reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      apartment_rooms: {
        Row: {
          apartment_id: string;
          available_from: string;
          created_at: string;
          id: string;
          is_available: boolean;
          label: string | null;
          monthly_price: number;
        };
        Insert: {
          apartment_id: string;
          available_from: string;
          created_at?: string;
          id?: string;
          is_available?: boolean;
          label?: string | null;
          monthly_price: number;
        };
        Update: {
          apartment_id?: string;
          available_from?: string;
          created_at?: string;
          id?: string;
          is_available?: boolean;
          label?: string | null;
          monthly_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'apartment_rooms_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartment_stats';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'apartment_rooms_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_rooms_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_rooms_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'listing_address_access';
            referencedColumns: ['apartment_id'];
          },
        ];
      };
      apartments: {
        Row: {
          address: string | null;
          available_from: string | null;
          bedrooms: number;
          bills_included: boolean;
          contact_url: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_sublet: boolean;
          lat: number;
          lister_id: string | null;
          lng: number;
          photos: string[];
          price: number;
          public_lat: number;
          public_lng: number;
          public_location_label: string;
          source: string;
          status: string;
          title: string;
          revision: number;
        };
        Insert: {
          address?: string | null;
          available_from?: string | null;
          bedrooms: number;
          bills_included?: boolean;
          contact_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_sublet?: boolean;
          lat: number;
          lister_id?: string | null;
          lng: number;
          photos?: string[];
          price: number;
          public_lat?: number;
          public_lng?: number;
          public_location_label?: string;
          source?: string;
          status?: string;
          title: string;
          revision?: number;
        };
        Update: {
          address?: string | null;
          available_from?: string | null;
          bedrooms?: number;
          bills_included?: boolean;
          contact_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_sublet?: boolean;
          lat?: number;
          lister_id?: string | null;
          lng?: number;
          photos?: string[];
          price?: number;
          public_lat?: number;
          public_lng?: number;
          public_location_label?: string;
          source?: string;
          status?: string;
          title?: string;
          revision?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'apartments_lister_id_fkey';
            columns: ['lister_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartments_lister_id_fkey';
            columns: ['lister_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          last_read_at: string;
          last_read_seq: number;
          user_id: string;
          visible_after_seq: number;
        };
        Insert: {
          conversation_id: string;
          last_read_at?: string;
          last_read_seq?: number;
          user_id: string;
          visible_after_seq?: number;
        };
        Update: {
          conversation_id?: string;
          last_read_at?: string;
          last_read_seq?: number;
          user_id?: string;
          visible_after_seq?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_members_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          group_id: string | null;
          id: string;
          last_message_at: string | null;
          last_message_body: string | null;
          last_message_seq: number;
        };
        Insert: {
          created_at?: string;
          group_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          last_message_body?: string | null;
          last_message_seq?: number;
        };
        Update: {
          created_at?: string;
          group_id?: string | null;
          id?: string;
          last_message_at?: string | null;
          last_message_body?: string | null;
          last_message_seq?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
      };
      discovery_passes: {
        Row: {
          created_at: string;
          from_user: string;
          target_id: string;
          target_kind: string;
        };
        Insert: {
          created_at?: string;
          from_user: string;
          target_id: string;
          target_kind: string;
        };
        Update: {
          created_at?: string;
          from_user?: string;
          target_id?: string;
          target_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'discovery_passes_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'discovery_passes_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      group_admission_votes: {
        Row: {
          introduction_id: string;
          membership_version: number;
          voter_id: string;
        };
        Insert: {
          introduction_id: string;
          membership_version: number;
          voter_id: string;
        };
        Update: {
          introduction_id?: string;
          membership_version?: number;
          voter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_admission_votes_introduction_id_fkey';
            columns: ['introduction_id'];
            isOneToOne: false;
            referencedRelation: 'likes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_admission_votes_voter_id_fkey';
            columns: ['voter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_admission_votes_voter_id_fkey';
            columns: ['voter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      group_invites: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          invitee_id: string;
          inviter_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          invitee_id: string;
          inviter_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          invitee_id?: string;
          inviter_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_invites_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_invitee_id_fkey';
            columns: ['invitee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_invitee_id_fkey';
            columns: ['invitee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_inviter_id_fkey';
            columns: ['inviter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_inviter_id_fkey';
            columns: ['inviter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          joined_at: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          joined_at?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          admin_id: string;
          admission_policy: string;
          apartment_id: string | null;
          budget_max: number | null;
          budget_min: number | null;
          created_at: string;
          id: string;
          membership_version: number;
          name: string | null;
          status: string;
        };
        Insert: {
          admin_id: string;
          admission_policy?: string;
          apartment_id?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          id?: string;
          membership_version?: number;
          name?: string | null;
          status?: string;
        };
        Update: {
          admin_id?: string;
          admission_policy?: string;
          apartment_id?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          id?: string;
          membership_version?: number;
          name?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'groups_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'groups_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'groups_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartment_stats';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'groups_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'groups_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'groups_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'listing_address_access';
            referencedColumns: ['apartment_id'];
          },
        ];
      };
      likes: {
        Row: {
          conversation_id: string | null;
          created_at: string;
          from_user: string;
          id: string;
          message: string;
          ref_tag: string | null;
          status: string;
          to_group: string | null;
          to_user: string | null;
        };
        Insert: {
          conversation_id?: string | null;
          created_at?: string;
          from_user: string;
          id?: string;
          message: string;
          ref_tag?: string | null;
          status?: string;
          to_group?: string | null;
          to_user?: string | null;
        };
        Update: {
          conversation_id?: string | null;
          created_at?: string;
          from_user?: string;
          id?: string;
          message?: string;
          ref_tag?: string | null;
          status?: string;
          to_group?: string | null;
          to_user?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'likes_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_to_group_fkey';
            columns: ['to_group'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      listing_inquiries: {
        Row: {
          apartment_id: string;
          conversation_id: string | null;
          created_at: string;
          id: string;
          requester_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          apartment_id: string;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          requester_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          apartment_id?: string;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          requester_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'listing_inquiries_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartment_stats';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'listing_inquiries_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listing_inquiries_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listing_inquiries_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'listing_address_access';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'listing_inquiries_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listing_inquiries_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listing_inquiries_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          kind: string;
          message_seq: number;
          request_key: string | null;
          sender_id: string | null;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          kind?: string;
          message_seq?: never;
          request_key?: never;
          sender_id?: string | null;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          message_seq?: number;
          request_key?: never;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      mvp_limits: {
        Row: {
          group_members: number;
          id: boolean;
          introductions_per_day: number;
        };
        Insert: {
          group_members: number;
          id?: boolean;
          introductions_per_day: number;
        };
        Update: {
          group_members?: number;
          id?: boolean;
          introductions_per_day?: number;
        };
        Relationships: [];
      };
      profile_passes: {
        Row: {
          created_at: string;
          from_user: string;
          to_user: string;
        };
        Insert: {
          created_at?: string;
          from_user: string;
          to_user: string;
        };
        Update: {
          created_at?: string;
          from_user?: string;
          to_user?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_passes_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_passes_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_passes_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_passes_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_photos: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          profile_id: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          profile_id: string;
          url: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          profile_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_photos_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_photos_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_private: {
        Row: {
          full_name: string | null;
          adult_confirmed_at: string | null;
          agency_name: string | null;
          birth_date: string | null;
          budget_max: number | null;
          budget_min: number | null;
          created_at: string;
          move_in_date: string | null;
          phone: string | null;
          profile_id: string;
          student_email: string | null;
          student_email_verified_at: string | null;
          updated_at: string;
        };
        Insert: {
          full_name?: string | null;
          adult_confirmed_at?: string | null;
          agency_name?: string | null;
          birth_date?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          move_in_date?: string | null;
          phone?: string | null;
          profile_id: string;
          student_email?: string | null;
          student_email_verified_at?: string | null;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          adult_confirmed_at?: string | null;
          agency_name?: string | null;
          birth_date?: string | null;
          budget_max?: number | null;
          budget_min?: number | null;
          created_at?: string;
          move_in_date?: string | null;
          phone?: string | null;
          profile_id?: string;
          student_email?: string | null;
          student_email_verified_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_private_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_private_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          agency_name: string | null;
          bio: string | null;
          cleanliness: string | null;
          climate: string | null;
          cooking_dynamics: string | null;
          created_at: string;
          default_home: string;
          financial_splitting: string | null;
          gender: string | null;
          gender_dynamic: string | null;
          id: string;
          is_pro: boolean;
          is_verified: boolean;
          kitchen_dietary: string | null;
          last_active_at: string;
          miluim_reserve_duty: string | null;
          mode: string | null;
          music_vibe: string | null;
          name: string;
          noise_tolerance: string | null;
          notifications_enabled: boolean;
          onboarded: boolean;
          pets: string | null;
          phone: string | null;
          photo_blur_url: string | null;
          photo_url: string | null;
          public_badges: string[];
          relationship_status: string | null;
          sleep_schedule: string | null;
          smoking: string | null;
          social_guests: string | null;
          study_habits: string | null;
          weekend_routine: string | null;
        };
        Insert: {
          agency_name?: string | null;
          bio?: string | null;
          cleanliness?: string | null;
          climate?: string | null;
          cooking_dynamics?: string | null;
          created_at?: string;
          default_home?: string;
          financial_splitting?: string | null;
          gender?: string | null;
          gender_dynamic?: string | null;
          id: string;
          is_pro?: boolean;
          is_verified?: boolean;
          kitchen_dietary?: string | null;
          last_active_at?: string;
          miluim_reserve_duty?: string | null;
          mode?: string | null;
          music_vibe?: string | null;
          name: string;
          noise_tolerance?: string | null;
          notifications_enabled?: boolean;
          onboarded?: boolean;
          pets?: string | null;
          phone?: string | null;
          photo_blur_url?: string | null;
          photo_url?: string | null;
          public_badges?: string[];
          relationship_status?: string | null;
          sleep_schedule?: string | null;
          smoking?: string | null;
          social_guests?: string | null;
          study_habits?: string | null;
          weekend_routine?: string | null;
        };
        Update: {
          agency_name?: string | null;
          bio?: string | null;
          cleanliness?: string | null;
          climate?: string | null;
          cooking_dynamics?: string | null;
          created_at?: string;
          default_home?: string;
          financial_splitting?: string | null;
          gender?: string | null;
          gender_dynamic?: string | null;
          id?: string;
          is_pro?: boolean;
          is_verified?: boolean;
          kitchen_dietary?: string | null;
          last_active_at?: string;
          miluim_reserve_duty?: string | null;
          mode?: string | null;
          music_vibe?: string | null;
          name?: string;
          noise_tolerance?: string | null;
          notifications_enabled?: boolean;
          onboarded?: boolean;
          pets?: string | null;
          phone?: string | null;
          photo_blur_url?: string | null;
          photo_url?: string | null;
          public_badges?: string[];
          relationship_status?: string | null;
          sleep_schedule?: string | null;
          smoking?: string | null;
          social_guests?: string | null;
          study_habits?: string | null;
          weekend_routine?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          token: string;
          user_id: string;
        };
        Insert: {
          token: string;
          user_id: string;
        };
        Update: {
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      saves: {
        Row: {
          apartment_id: string;
          created_at: string;
          group_id: string | null;
          user_id: string;
        };
        Insert: {
          apartment_id: string;
          created_at?: string;
          group_id?: string | null;
          user_id: string;
        };
        Update: {
          apartment_id?: string;
          created_at?: string;
          group_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'saves_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartment_stats';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'saves_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'saves_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'saves_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'listing_address_access';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'saves_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'saves_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'saves_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
      user_reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reported_id?: string;
          reporter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_reports_reported_id_fkey';
            columns: ['reported_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_reports_reported_id_fkey';
            columns: ['reported_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_public';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      apartment_hype_faces: {
        Row: {
          apartment_id: string | null;
          name: string | null;
          photo_url: string | null;
          unblurred: boolean | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartment_stats';
            referencedColumns: ['apartment_id'];
          },
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'apartments_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'apartment_interests_apartment_id_fkey';
            columns: ['apartment_id'];
            isOneToOne: false;
            referencedRelation: 'listing_address_access';
            referencedColumns: ['apartment_id'];
          },
        ];
      };
      apartment_stats: {
        Row: {
          apartment_id: string | null;
          interest_count: number | null;
          report_count: number | null;
        };
        Insert: {
          apartment_id?: string | null;
          interest_count?: never;
          report_count?: never;
        };
        Update: {
          apartment_id?: string | null;
          interest_count?: never;
          report_count?: never;
        };
        Relationships: [];
      };
      apartments_public: {
        Row: {
          available_from: string | null;
          available_room_count: number;
          bedrooms: number;
          bills_included: boolean;
          created_at: string;
          description: string | null;
          id: string;
          interest_count: number;
          is_sublet: boolean;
          lat: number;
          lng: number;
          max_room_price: number;
          min_room_price: number;
          photos: string[];
          price: number;
          public_location_label: string;
          status: string;
          title: string;
        };
        Relationships: [];
      };
      listing_address_access: {
        Row: {
          address: string | null;
          apartment_id: string | null;
          lat: number | null;
          lng: number | null;
        };
        Relationships: [];
      };
      profiles_public: {
        Row: {
          lifestyle_facts: Json;
          age: number | null;
          bio: string | null;
          cleanliness: string | null;
          climate: string | null;
          cooking_dynamics: string | null;
          financial_splitting: string | null;
          gender: string | null;
          gender_dynamic: string | null;
          id: string | null;
          kitchen_dietary: string | null;
          miluim_reserve_duty: string | null;
          music_vibe: string | null;
          name: string | null;
          noise_tolerance: string | null;
          pets: string | null;
          photo_url: string | null;
          public_badges: string[] | null;
          relationship_status: string | null;
          sleep_schedule: string | null;
          smoking: string | null;
          social_guests: string | null;
          study_habits: string | null;
          weekend_routine: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_owned_listing_editor: { Args: { p_listing_id: string }; Returns: Json };
      cancel_listing_draft_publication: { Args: { p_draft_id: string; p_expected_revision: number }; Returns: Database['public']['Tables']['listing_drafts']['Row'] };
      verify_listing_draft_publication_snapshot: { Args: { p_draft_id: string; p_expected_revision: number; p_payload: Json }; Returns: boolean };
      begin_listing_draft_publication: { Args: { p_draft_id: string; p_expected_revision: number; p_payload: Json }; Returns: Database['public']['Tables']['listing_drafts']['Row'] };
      complete_listing_draft: { Args: { p_draft_id: string; p_expected_revision: number }; Returns: Database['public']['Tables']['listing_drafts']['Row'] };
      begin_listing_draft_deletion: { Args: { p_draft_id: string; p_expected_revision: number }; Returns: Json };
      list_listing_draft_deletion_objects: { Args: { p_draft_id: string; p_after?: string | null; p_limit?: number }; Returns: Json };
      finish_listing_draft_deletion: { Args: { p_draft_id: string; p_expected_revision: number }; Returns: undefined };
      set_listing_draft_photos: {
        Args: { p_draft_id: string; p_expected_revision: number; p_photos: Json };
        Returns: Database['public']['Tables']['listing_drafts']['Row'];
      };
      create_listing_draft: {
        Args: { p_import_receipt_id?: string | null; p_source_listing_id?: string | null; p_source_revision?: number | null; p_fields?: Json };
        Returns: Database['public']['Tables']['listing_drafts']['Row'];
      };
      save_listing_draft: {
        Args: { p_draft_id: string; p_expected_revision: number; p_fields: Json };
        Returns: Database['public']['Tables']['listing_drafts']['Row'];
      };
      save_lister_profile: {
        Args: { p_name: string; p_phone: string; p_agency: string; p_expected_revision: number; p_request_key: string };
        Returns: Json;
      };

      save_resident_profile: {
        Args: { p_name: string; p_birth_date: string | null; p_phone: string; p_bio: string; p_facts: Json; p_preferences: Json; p_disclosed_fields: string[]; p_complete: boolean; p_expected_revision: number; p_request_key: string };
        Returns: Json;
      };

      send_chat_message: {
        Args: { p_conversation_id: string; p_body: string; p_request_key: string };
        Returns: { id: string; conversation_id: string; sender_id: string | null; kind: string; body: string; created_at: string; message_seq: number; request_key: string | null }[];
      };
      mark_conversation_read: {
        Args: { p_conversation_id: string; p_through_seq: number };
        Returns: number;
      };
      reserve_geocoding_request: { Args: { p_actor: string }; Returns: boolean };
      pause_geocoding_provider: { Args: Record<PropertyKey, never>; Returns: undefined };
      accept_like: { Args: { p_like_id: string }; Returns: string };
      accept_listing_inquiry: {
        Args: { p_inquiry_id: string };
        Returns: string;
      };
      admit_group_member: { Args: { g: string; u: string }; Returns: string };
      am_pro: { Args: never; Returns: boolean };
      blocked_with: { Args: { other: string }; Returns: boolean };
      can_access_group: { Args: { g: string }; Returns: boolean };
      can_read_message: {
        Args: { cid: string; seq: number };
        Returns: boolean;
      };
      configure_group: {
        Args: { p_group: string | null; p_policy: string };
        Returns: undefined;
      };
      convert_to_lister: {
        Args: { p_agency?: string | null; p_phone: string };
        Returns: undefined;
      };
      create_group_from_chats: {
        Args: { p_contacts: string[]; p_name: string; p_policy?: string };
        Returns: string;
      };
      create_listing_inquiry: {
        Args: { p_apartment_id: string };
        Returns: string;
      };
      decide_group_introduction: { Args: { p_like: string }; Returns: string };
      discover_groups: {
        Args: { p_after?: string | null };
        Returns: {
          admission_policy: string;
          id: string;
          members: Json;
          name: string;
        }[];
      };
      discover_individuals: {
        Args: { p_after?: string | null };
        Returns: Database['public']['Views']['profiles_public']['Row'][];
        SetofOptions: {
          from: '*';
          to: 'profiles_public';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_public_listing: {
        Args: { p_listing_id: string };
        Returns: {
          available_from: string;
          available_room_count: number;
          bedrooms: number;
          bills_included: boolean;
          description: string;
          id: string;
          is_sublet: boolean;
          max_room_price: number;
          min_room_price: number;
          photos: string[];
          public_location_label: string;
          title: string;
        }[];
      };
      invite_group_contact: {
        Args: { p_contact: string; p_group: string | null };
        Returns: undefined;
      };
      is_conversation_member: { Args: { cid: string }; Returns: boolean };
      list_chat_inbox: {
        Args: never;
        Returns: {
          conversation_id: string;
          display_name: string;
          group_id: string;
          last_message_at: string;
          last_message_body: string;
          other_user_id: string;
          photo_url: string;
          unread_count: number;
        }[];
      };
      list_accessible_groups: {
        Args: never;
        Returns: {
          admission_policy: string;
          admin_id: string;
          id: string;
          membership_version: number;
          name: string;
        }[];
      };
      list_group_contacts: {
        Args: never;
        Returns: {
          id: string;
          name: string;
        }[];
      };
      list_group_invites: {
        Args: never;
        Returns: {
          group_name: string;
          id: string;
          inviter_name: string;
        }[];
      };
      pass_discovery: {
        Args: { p_kind: string; p_target: string };
        Returns: undefined;
      };
      publish_apartment: {
        Args: { p_draft: Json; p_listing_id: string };
        Returns: string;
      };
      publish_apartment_once: {
        Args: { p_draft: Json; p_request_key: string };
        Returns: string;
      };
      cancel_listing_publication: {
        Args: { p_request_key: string };
        Returns: string;
      };
      remove_group_member: {
        Args: { p_group: string | null; p_member: string };
        Returns: undefined;
      };
      respond_group_invite: {
        Args: { p_accept: boolean; p_invite: string };
        Returns: string;
      };
      save_onboarding: {
        Args: {
          p_agency: string;
          p_bio: string;
          p_birth_date: string | null;
          p_complete: boolean;
          p_name: string;
          p_phone: string;
          p_resident: boolean;
          p_tags: Json;
        };
        Returns: undefined;
      };
      send_introduction: {
        Args: {
          p_group: string | null;
          p_message: string;
          p_ref_tag: string | null;
          p_user: string | null;
        };
        Returns: string;
      };
      toggle_apartment_save_and_interest: {
        Args: { p_apartment_id: string };
        Returns: {
          interest_count: number;
          saved: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
