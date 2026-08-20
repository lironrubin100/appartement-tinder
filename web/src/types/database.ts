/* Database type definitions for Shutaf
 * Generated from DECISIONS.md (C1, C13) and ARCHITECTURE.md
 * The 31-category taxonomy is structured as dedicated columns, not free text[]
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          full_name: string;
          display_name: string;
          photo_url: string | null;
          bio: string | null;
          phone_number: string | null;
          is_verified: boolean;
          is_banned: boolean;
          residency: "resident" | "non_resident";
          current_mode: "Solo" | "Group" | "Room-Filler" | "Lister" | null;
          deleted_at: string | null;

          // Renter-lifestyle categories (16 total) — DECIDED C1/C2/C13
          gender_dynamic:
            | "1_guy_guys"
            | "2_girls_1_girl"
            | "coed_anyone"
            | null;
          cleanliness: "very_clean" | "clean" | "average" | "relaxed" | null;
          sleep_schedule:
            | "early_bed_early_wake"
            | "night_owl"
            | "flexible"
            | null;
          social_guests:
            | "frequent_visitors"
            | "occasional"
            | "rarely"
            | null;
          noise_tolerance:
            | "quiet"
            | "moderate"
            | "high"
            | null;
          music_vibe:
            | "silent"
            | "ambient"
            | "upbeat"
            | "loud"
            | null;
          climate: "cold" | "moderate" | "hot" | null;
          smoking: "yes" | "no" | "outdoor_only" | null;
          kitchen_dietary:
            | "strict"
            | "vegetarian"
            | "mixed"
            | null;
          cooking_dynamics:
            | "shared_cooking"
            | "individual"
            | "meal_prep"
            | null;
          pets: "yes" | "no" | "small_only" | null;
          weekend_routine:
            | "home_body"
            | "mixed"
            | "always_out"
            | null;
          relationship_status:
            | "single"
            | "in_relationship"
            | "flexible"
            | null;
          study_habits:
            | "heavy_studying"
            | "moderate"
            | "minimal"
            | null;
          financial_splitting:
            | "strict"
            | "flexible"
            | "shared_expenses"
            | null;
          miluim_reserve_duty:
            | "active"
            | "occasional"
            | "none"
            | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          full_name: string;
          display_name: string;
          photo_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          is_verified?: boolean;
          is_banned?: boolean;
          residency: "resident" | "non_resident";
          current_mode?: "Solo" | "Group" | "Room-Filler" | "Lister" | null;
          deleted_at?: string | null;
          gender_dynamic?: string | null;
          cleanliness?: string | null;
          sleep_schedule?: string | null;
          social_guests?: string | null;
          noise_tolerance?: string | null;
          music_vibe?: string | null;
          climate?: string | null;
          smoking?: string | null;
          kitchen_dietary?: string | null;
          cooking_dynamics?: string | null;
          pets?: string | null;
          weekend_routine?: string | null;
          relationship_status?: string | null;
          study_habits?: string | null;
          financial_splitting?: string | null;
          miluim_reserve_duty?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          full_name?: string;
          display_name?: string;
          photo_url?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          is_verified?: boolean;
          is_banned?: boolean;
          residency?: "resident" | "non_resident";
          current_mode?: "Solo" | "Group" | "Room-Filler" | "Lister" | null;
          deleted_at?: string | null;
          gender_dynamic?: string | null;
          cleanliness?: string | null;
          sleep_schedule?: string | null;
          social_guests?: string | null;
          noise_tolerance?: string | null;
          music_vibe?: string | null;
          climate?: string | null;
          smoking?: string | null;
          kitchen_dietary?: string | null;
          cooking_dynamics?: string | null;
          pets?: string | null;
          weekend_routine?: string | null;
          relationship_status?: string | null;
          study_habits?: string | null;
          financial_splitting?: string | null;
          miluim_reserve_duty?: string | null;
        };
      };

      apartments: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          poster_id: string;
          title: string;
          description: string | null;
          price: number;
          currency: string;
          bedrooms: number;
          latitude: number;
          longitude: number;
          address: string | null;
          available_from: string;
          phone_contact: string;
          is_furnished: boolean;
          is_sublet: boolean;
          bills_included: boolean;
          status: "active" | "rented" | "flagged" | "archived";
          viewed_count: number;
          interest_count: number;
          posted_at: string;
          expires_at: string | null;
          deleted_at: string | null;

          // Apartment-characteristic categories (15 total) — DECIDED C1/C2/C13
          proximity_to_bgu:
            | "walkable"
            | "nearby"
            | "far"
            | null;
          ac: "yes" | "no" | "partial" | null;
          security_safety:
            | "gated"
            | "secure_building"
            | "open"
            | null;
          water_heating:
            | "solar"
            | "gas"
            | "electric"
            | null;
          furnishing:
            | "fully_furnished"
            | "partial"
            | "unfurnished"
            | null;
          hand_me_downs:
            | "yes"
            | "no"
            | null;
          outdoor_space:
            | "balcony"
            | "patio"
            | "yard"
            | "none"
            | null;
          laundry:
            | "in_unit"
            | "building"
            | "none"
            | null;
          accessibility:
            | "elevator"
            | "ground_floor"
            | "stairs"
            | null;
          parking:
            | "included"
            | "nearby"
            | "none"
            | null;
          pet_rules:
            | "allowed"
            | "small_only"
            | "not_allowed"
            | null;
          kitchen_setup:
            | "full"
            | "kitchenette"
            | "shared"
            | null;
          hidden_costs:
            | "maintenance"
            | "utilities_separate"
            | "none"
            | null;
          internet:
            | "included"
            | "available"
            | "none"
            | null;
          roommate_cap: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          poster_id: string;
          title: string;
          description?: string | null;
          price: number;
          currency?: string;
          bedrooms: number;
          latitude: number;
          longitude: number;
          address?: string | null;
          available_from: string;
          phone_contact: string;
          is_furnished?: boolean;
          is_sublet?: boolean;
          bills_included?: boolean;
          status?: "active" | "rented" | "flagged" | "archived";
          viewed_count?: number;
          interest_count?: number;
          posted_at?: string;
          expires_at?: string | null;
          deleted_at?: string | null;
          proximity_to_bgu?: string | null;
          ac?: string | null;
          security_safety?: string | null;
          water_heating?: string | null;
          furnishing?: string | null;
          hand_me_downs?: string | null;
          outdoor_space?: string | null;
          laundry?: string | null;
          accessibility?: string | null;
          parking?: string | null;
          pet_rules?: string | null;
          kitchen_setup?: string | null;
          hidden_costs?: string | null;
          internet?: string | null;
          roommate_cap?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          poster_id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          currency?: string;
          bedrooms?: number;
          latitude?: number;
          longitude?: number;
          address?: string | null;
          available_from?: string;
          phone_contact?: string;
          is_furnished?: boolean;
          is_sublet?: boolean;
          bills_included?: boolean;
          status?: "active" | "rented" | "flagged" | "archived";
          viewed_count?: number;
          interest_count?: number;
          posted_at?: string;
          expires_at?: string | null;
          deleted_at?: string | null;
          proximity_to_bgu?: string | null;
          ac?: string | null;
          security_safety?: string | null;
          water_heating?: string | null;
          furnishing?: string | null;
          hand_me_downs?: string | null;
          outdoor_space?: string | null;
          laundry?: string | null;
          accessibility?: string | null;
          parking?: string | null;
          pet_rules?: string | null;
          kitchen_setup?: string | null;
          hidden_costs?: string | null;
          internet?: string | null;
          roommate_cap?: number | null;
        };
      };

      swipes: {
        Row: {
          id: string;
          created_at: string;
          sender_id: string;
          receiver_id: string | null;
          apartment_id: string | null;
          message: string;
          action: "like" | "pass";
          is_undone: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          sender_id: string;
          receiver_id?: string | null;
          apartment_id?: string | null;
          message: string;
          action: "like" | "pass";
          is_undone?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          sender_id?: string;
          receiver_id?: string | null;
          apartment_id?: string | null;
          message?: string;
          action?: "like" | "pass";
          is_undone?: boolean;
        };
      };

      matches: {
        Row: {
          id: string;
          created_at: string;
          user_a_id: string;
          user_b_id: string;
          match_type: "roommate" | "apartment_inquiry";
          match_score: number;
          status: "pending" | "accepted" | "rejected" | "archived";
          conversation_id: string | null;
          initiated_by: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_a_id: string;
          user_b_id: string;
          match_type: "roommate" | "apartment_inquiry";
          match_score: number;
          status?: "pending" | "accepted" | "rejected" | "archived";
          conversation_id?: string | null;
          initiated_by: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_a_id?: string;
          user_b_id?: string;
          match_type?: "roommate" | "apartment_inquiry";
          match_score?: number;
          status?: "pending" | "accepted" | "rejected" | "archived";
          conversation_id?: string | null;
          initiated_by?: string;
        };
      };

      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          last_message_id: string | null;
          last_message_at: string | null;
          participant_a: string;
          participant_b: string;
          context_type: "roommate" | "apartment";
          context_id: string | null;
          is_archived_by_a: boolean;
          is_archived_by_b: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          last_message_at?: string | null;
          participant_a: string;
          participant_b: string;
          context_type: "roommate" | "apartment";
          context_id?: string | null;
          is_archived_by_a?: boolean;
          is_archived_by_b?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          last_message_at?: string | null;
          participant_a?: string;
          participant_b?: string;
          context_type?: "roommate" | "apartment";
          context_id?: string | null;
          is_archived_by_a?: boolean;
          is_archived_by_b?: boolean;
        };
      };

      messages: {
        Row: {
          id: string;
          created_at: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: "text" | "listing_card";
          listing_id: string | null;
          is_read: boolean;
          read_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: "text" | "listing_card";
          listing_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: "text" | "listing_card";
          listing_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          deleted_at?: string | null;
        };
      };

      groups: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          admin_id: string;
          status: "open" | "closed" | "archived";
          max_members: number;
          created_from_conversation_id: string | null;
          deleted_at: string | null;
          shared_budget_min: number | null;
          shared_budget_max: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          admin_id: string;
          status?: "open" | "closed" | "archived";
          max_members?: number;
          created_from_conversation_id?: string | null;
          deleted_at?: string | null;
          shared_budget_min?: number | null;
          shared_budget_max?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          admin_id?: string;
          status?: "open" | "closed" | "archived";
          max_members?: number;
          created_from_conversation_id?: string | null;
          deleted_at?: string | null;
          shared_budget_min?: number | null;
          shared_budget_max?: number | null;
        };
      };

      group_members: {
        Row: {
          id: string;
          created_at: string;
          group_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          group_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          group_id?: string;
          user_id?: string;
          role?: "admin" | "member";
          joined_at?: string;
          left_at?: string | null;
        };
      };

      apartment_listings_photos: {
        Row: {
          id: string;
          created_at: string;
          apartment_id: string;
          photo_url: string;
          blur_url: string | null;
          display_order: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          apartment_id: string;
          photo_url: string;
          blur_url?: string | null;
          display_order: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          apartment_id?: string;
          photo_url?: string;
          blur_url?: string | null;
          display_order?: number;
        };
      };

      favorites: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          apartment_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          apartment_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          apartment_id?: string;
        };
      };

      hand_me_downs: {
        Row: {
          id: string;
          created_at: string;
          apartment_id: string;
          seller_id: string;
          title: string;
          description: string | null;
          price: number;
          photo_url: string | null;
          status: "available" | "sold" | "removed";
        };
        Insert: {
          id?: string;
          created_at?: string;
          apartment_id: string;
          seller_id: string;
          title: string;
          description?: string | null;
          price: number;
          photo_url?: string | null;
          status?: "available" | "sold" | "removed";
        };
        Update: {
          id?: string;
          created_at?: string;
          apartment_id?: string;
          seller_id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          photo_url?: string | null;
          status?: "available" | "sold" | "removed";
        };
      };
    };
    Views: {
      apartment_stats: {
        Row: {
          apartment_id: string;
          interest_count: number;
          viewer_count: number;
        };
      };
    };
    Functions: {
      accept_like: {
        Args: {
          p_swipe_id: string;
          p_receiver_id: string;
        };
        Returns: {
          conversation_id: string;
          match_id: string;
        };
      };
      get_discover_feed: {
        Args: {
          p_user_id: string;
          p_limit?: number;
          p_cursor?: string;
        };
        Returns: Array<{
          id: string;
          display_name: string;
          photo_url: string | null;
          match_score: number;
          bio: string | null;
        }>;
      };
      get_map_listings: {
        Args: {
          p_min_lat: number;
          p_max_lat: number;
          p_min_lng: number;
          p_max_lng: number;
          p_zoom: number;
        };
        Returns: Array<{
          id: string;
          lat: number;
          lng: number;
          price: number;
          is_favorited: boolean;
        }>;
      };
    };
  };
};
