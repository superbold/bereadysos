export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          calc_type: Database['public']['Enums']['calc_type']
          default_daily_per_person: number | null
          default_unit: string | null
          icon: string | null
          id: string
          name: string
          recommended_qty: number | null
          slug: string
          sort_order: number
        }
        Insert: {
          calc_type: Database['public']['Enums']['calc_type']
          default_daily_per_person?: number | null
          default_unit?: string | null
          icon?: string | null
          id?: string
          name: string
          recommended_qty?: number | null
          slug: string
          sort_order?: number
        }
        Update: {
          calc_type?: Database['public']['Enums']['calc_type']
          default_daily_per_person?: number | null
          default_unit?: string | null
          icon?: string | null
          id?: string
          name?: string
          recommended_qty?: number | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          role: Database['public']['Enums']['member_role']
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          role?: Database['public']['Enums']['member_role']
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          role?: Database['public']['Enums']['member_role']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          }
        ]
      }
      households: {
        Row: {
          created_at: string
          headcount: number
          id: string
          name: string
          target_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          headcount?: number
          id?: string
          name?: string
          target_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          headcount?: number
          id?: string
          name?: string
          target_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category_id: string
          created_at: string
          daily_override: number | null
          expiration_date: string | null
          household_id: string
          id: string
          location: string | null
          min_quantity: number | null
          name: string
          notes: string | null
          quantity: number
          servings_per_unit: number | null
          unit: string | null
          updated_at: string
          volume_per_unit: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          daily_override?: number | null
          expiration_date?: string | null
          household_id: string
          id?: string
          location?: string | null
          min_quantity?: number | null
          name: string
          notes?: string | null
          quantity?: number
          servings_per_unit?: number | null
          unit?: string | null
          updated_at?: string
          volume_per_unit?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          daily_override?: number | null
          expiration_date?: string | null
          household_id?: string
          id?: string
          location?: string | null
          min_quantity?: number | null
          name?: string
          notes?: string | null
          quantity?: number
          servings_per_unit?: number | null
          unit?: string | null
          updated_at?: string
          volume_per_unit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'items_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          invited_email: string
          status: Database['public']['Enums']['invite_status']
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          invited_email: string
          status?: Database['public']['Enums']['invite_status']
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          invited_email?: string
          status?: Database['public']['Enums']['invite_status']
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_household: {
        Args: { p_name?: string }
        Returns: Database['public']['Tables']['households']['Row']
      }
      ensure_profile: {
        Args: { p_first_name?: string }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      create_household_invite: {
        Args: { p_email: string }
        Returns: Database['public']['Tables']['household_invites']['Row']
      }
      cancel_household_invite: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      revoke_household_member: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      preview_household_invite: {
        Args: { p_token: string }
        Returns: {
          household_name: string
          inviter_first_name: string
          invited_email: string
          expires_at: string
          is_valid: boolean
        }[]
      }
      accept_household_invite: {
        Args: { p_token: string }
        Returns: Database['public']['Tables']['households']['Row']
      }
      is_household_member: {
        Args: { hid: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { hid: string }
        Returns: boolean
      }
    }
    Enums: {
      calc_type: 'consumable' | 'checklist'
      invite_status: 'pending' | 'accepted' | 'revoked' | 'expired'
      member_role: 'owner' | 'member'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
      & Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    & Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
      ? R
      : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables']
    & DefaultSchema['Views'])
    ? (DefaultSchema['Tables']
      & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
        ? R
        : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I
  }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U
  }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema['Enums']
  | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type Category = Tables<'categories'>
export type Household = Tables<'households'>
export type HouseholdMember = Tables<'household_members'>
export type HouseholdInvite = Tables<'household_invites'>
export type Profile = Tables<'profiles'>
export type MemberRole = Database['public']['Enums']['member_role']
export type InviteStatus = Database['public']['Enums']['invite_status']
export type Item = Tables<'items'>
