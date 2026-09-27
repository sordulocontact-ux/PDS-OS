export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          disabled_at: string | null
          disabled_reason: string | null
          id: string
          person_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          disabled_reason?: string | null
          id: string
          person_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          disabled_reason?: string | null
          id?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_events: {
        Row: {
          actor_person_id: string | null
          artist_id: string | null
          catalog_only: boolean
          created_at: string
          detail: Json
          id: string
          kind: string
          master_id: string | null
          organization_id: string
          project_id: string | null
          seq: number
          subject_id: string | null
        }
        Insert: {
          actor_person_id?: string | null
          artist_id?: string | null
          catalog_only?: boolean
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          master_id?: string | null
          organization_id: string
          project_id?: string | null
          seq?: never
          subject_id?: string | null
        }
        Update: {
          actor_person_id?: string | null
          artist_id?: string | null
          catalog_only?: boolean
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          master_id?: string | null
          organization_id?: string
          project_id?: string | null
          seq?: never
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_person_id_fkey"
            columns: ["actor_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_artist_same_org"
            columns: ["artist_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "activity_events_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_contacts: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          organization_id: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          organization_id: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_contacts_artist_same_org"
            columns: ["artist_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "artist_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_files: {
        Row: {
          artist_id: string
          bytes: number
          category: string
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          mime: string
          organization_id: string
          path: string
        }
        Insert: {
          artist_id: string
          bytes: number
          category?: string
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          mime: string
          organization_id: string
          path: string
        }
        Update: {
          artist_id?: string
          bytes?: number
          category?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          mime?: string
          organization_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_files_artist_same_org"
            columns: ["artist_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "artist_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          archived_at: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          created_by: string | null
          deezer_id: number | null
          deezer_url: string | null
          id: string
          legal_name: string | null
          name: string
          notes: string | null
          organization_id: string
          picture_path: string | null
          picture_url: string | null
          relation: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          deezer_id?: number | null
          deezer_url?: string | null
          id?: string
          legal_name?: string | null
          name: string
          notes?: string | null
          organization_id: string
          picture_path?: string | null
          picture_url?: string | null
          relation: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          deezer_id?: number | null
          deezer_url?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          picture_path?: string | null
          picture_url?: string | null
          relation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          family: string | null
          id: string
          label: string
          lever_id: string | null
          note: string | null
          organization_id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          family?: string | null
          id?: string
          label: string
          lever_id?: string | null
          note?: string | null
          organization_id: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          family?: string | null
          id?: string
          label?: string
          lever_id?: string | null
          note?: string | null
          organization_id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_lever_same_org"
            columns: ["lever_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "levers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "budget_lines_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      call_reports: {
        Row: {
          call_id: string
          created_at: string
          created_by: string | null
          id: string
          input_tokens: number | null
          model: string
          organization_id: string
          output_tokens: number | null
          processing_ms: number | null
          provider: string
          summary: string
          transcript_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          organization_id: string
          output_tokens?: number | null
          processing_ms?: number | null
          provider: string
          summary: string
          transcript_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          organization_id?: string
          output_tokens?: number | null
          processing_ms?: number | null
          provider?: string
          summary?: string
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_reports_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "call_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_reports_transcript_same_org"
            columns: ["transcript_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      calls: {
        Row: {
          agenda: Json | null
          audio_bytes: number | null
          audio_mime: string | null
          audio_path: string | null
          consent: string
          consent_note: string | null
          consent_recorded_at: string | null
          consent_recorded_by: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          error_code: string | null
          id: string
          occurred_at: string
          organization_id: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: Json | null
          audio_bytes?: number | null
          audio_mime?: string | null
          audio_path?: string | null
          consent?: string
          consent_note?: string | null
          consent_recorded_at?: string | null
          consent_recorded_by?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          error_code?: string | null
          id?: string
          occurred_at?: string
          organization_id: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: Json | null
          audio_bytes?: number | null
          audio_mime?: string | null
          audio_path?: string | null
          consent?: string
          consent_note?: string | null
          consent_recorded_at?: string | null
          consent_recorded_by?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          error_code?: string | null
          id?: string
          occurred_at?: string
          organization_id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_consent_recorded_by_fkey"
            columns: ["consent_recorded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_versions: {
        Row: {
          bytes: number | null
          created_at: string
          created_by: string | null
          deliverable_id: string | null
          file_name: string | null
          id: string
          kind: string
          mime: string | null
          note: string | null
          number: number
          organization_id: string
          path: string | null
          project_id: string
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          url: string | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          file_name?: string | null
          id?: string
          kind: string
          mime?: string | null
          note?: string | null
          number?: number
          organization_id: string
          path?: string | null
          project_id: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          url?: string | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          file_name?: string | null
          id?: string
          kind?: string
          mime?: string | null
          note?: string | null
          number?: number
          organization_id?: string
          path?: string | null
          project_id?: string
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_versions_deliverable_same_org"
            columns: ["deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "strategy_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_versions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_versions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          created_by: string | null
          edited_at: string | null
          id: string
          kind: string
          message: string
          organization_id: string
          page_path: string | null
          screenshot_paths: string[]
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          id?: string
          kind: string
          message: string
          organization_id: string
          page_path?: string | null
          screenshot_paths?: string[]
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          id?: string
          kind?: string
          message?: string
          organization_id?: string
          page_path?: string | null
          screenshot_paths?: string[]
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_topic_same_org"
            columns: ["topic_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "feedback_topics"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      feedback_topics: {
        Row: {
          created_at: string
          edited_at: string | null
          edited_by: string | null
          id: string
          kind: string
          notion_error: string | null
          notion_page_id: string | null
          notion_synced_at: string | null
          notion_url: string | null
          organization_id: string
          priority: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          kind: string
          notion_error?: string | null
          notion_page_id?: string | null
          notion_synced_at?: string | null
          notion_url?: string | null
          organization_id: string
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          kind?: string
          notion_error?: string | null
          notion_page_id?: string | null
          notion_synced_at?: string | null
          notion_url?: string | null
          organization_id?: string
          priority?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_topics_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_topics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_topics_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      field_values: {
        Row: {
          created_at: string
          created_by: string | null
          deliverable: string
          field_key: string
          id: string
          organization_id: string
          project_id: string
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string
          status: string
          value: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deliverable: string
          field_key: string
          id?: string
          organization_id: string
          project_id: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type: string
          status: string
          value: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deliverable?: string
          field_key?: string
          id?: string
          organization_id?: string
          project_id?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          status?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "field_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_values_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "field_values_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      framing_constraints: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string
          review_status: string
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string
          text: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          review_status?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          text: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          review_status?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          text?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framing_constraints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framing_constraints_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "framing_constraints_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      levers: {
        Row: {
          created_at: string
          created_by: string | null
          family: string
          id: string
          label: string
          need_id: string | null
          organization_id: string
          project_id: string
          review_status: string
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          family: string
          id?: string
          label: string
          need_id?: string | null
          organization_id: string
          project_id: string
          review_status?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          family?: string
          id?: string
          label?: string
          need_id?: string | null
          organization_id?: string
          project_id?: string
          review_status?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "levers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "levers_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "levers_need_same_org"
            columns: ["need_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "levers_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      master_artists: {
        Row: {
          artist_id: string
          created_at: string
          master_id: string
          organization_id: string
          position: number
          role: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          master_id: string
          organization_id: string
          position: number
          role?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          master_id?: string
          organization_id?: string
          position?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_artists_artist_same_org"
            columns: ["artist_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_artists_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      master_contributors: {
        Row: {
          created_at: string
          created_by: string | null
          detail: string | null
          id: string
          master_id: string
          name: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          master_id: string
          name: string
          organization_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detail?: string | null
          id?: string
          master_id?: string
          name?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_contributors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_contributors_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_contributors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      master_declarations: {
        Row: {
          created_at: string
          created_by: string | null
          declared_on: string | null
          id: string
          master_id: string
          notes: string | null
          organism: string
          organization_id: string
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          declared_on?: string | null
          id?: string
          master_id: string
          notes?: string | null
          organism: string
          organization_id: string
          reference?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          declared_on?: string | null
          id?: string
          master_id?: string
          notes?: string | null
          organism?: string
          organization_id?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_declarations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_declarations_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_declarations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      master_files: {
        Row: {
          audio_state: string | null
          bytes: number
          category: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          file_name: string
          id: string
          master_id: string
          mime: string
          organization_id: string
          path: string
        }
        Insert: {
          audio_state?: string | null
          bytes: number
          category?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          file_name: string
          id?: string
          master_id: string
          mime: string
          organization_id: string
          path: string
        }
        Update: {
          audio_state?: string | null
          bytes?: number
          category?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          file_name?: string
          id?: string
          master_id?: string
          mime?: string
          organization_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_files_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      master_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          engineer: string | null
          id: string
          kind: string
          master_id: string
          notes: string | null
          organization_id: string
          session_date: string | null
          studio: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          engineer?: string | null
          id?: string
          kind: string
          master_id: string
          notes?: string | null
          organization_id: string
          session_date?: string | null
          studio?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          engineer?: string | null
          id?: string
          kind?: string
          master_id?: string
          notes?: string | null
          organization_id?: string
          session_date?: string | null
          studio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_sessions_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      master_splits: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          master_id: string
          organization_id: string
          party: string
          role: string
          share: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          master_id: string
          organization_id: string
          party: string
          role: string
          share: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          master_id?: string
          organization_id?: string
          party?: string
          role?: string
          share?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_splits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_splits_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_splits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tracks: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          master_id: string
          name: string
          organization_id: string
          performer: string | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          master_id: string
          name: string
          organization_id: string
          performer?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          master_id?: string
          name?: string
          organization_id?: string
          performer?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_tracks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tracks_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_tracks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tracks_session_same_org"
            columns: ["session_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "master_sessions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      masters: {
        Row: {
          archived_at: string | null
          audio_state: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          isrc: string | null
          iswc: string | null
          organization_id: string
          rights_holder: string | null
          rights_year: number | null
          title: string
          updated_at: string
          variant: string
          variant_label: string | null
        }
        Insert: {
          archived_at?: string | null
          audio_state?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          isrc?: string | null
          iswc?: string | null
          organization_id: string
          rights_holder?: string | null
          rights_year?: number | null
          title: string
          updated_at?: string
          variant?: string
          variant_label?: string | null
        }
        Update: {
          archived_at?: string | null
          audio_state?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          isrc?: string | null
          iswc?: string | null
          organization_id?: string
          rights_holder?: string | null
          rights_year?: number | null
          title?: string
          updated_at?: string
          variant?: string
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "masters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_events: {
        Row: {
          actor_account_id: string | null
          actor_person_id: string | null
          created_at: string
          id: string
          membership_id: string
          new_account_id: string | null
          new_note: string | null
          new_role: string | null
          new_status: string | null
          organization_id: string
          person_id: string
          previous_account_id: string | null
          previous_note: string | null
          previous_role: string | null
          previous_status: string | null
          source: string
        }
        Insert: {
          actor_account_id?: string | null
          actor_person_id?: string | null
          created_at?: string
          id?: string
          membership_id: string
          new_account_id?: string | null
          new_note?: string | null
          new_role?: string | null
          new_status?: string | null
          organization_id: string
          person_id: string
          previous_account_id?: string | null
          previous_note?: string | null
          previous_role?: string | null
          previous_status?: string | null
          source: string
        }
        Update: {
          actor_account_id?: string | null
          actor_person_id?: string | null
          created_at?: string
          id?: string
          membership_id?: string
          new_account_id?: string | null
          new_note?: string | null
          new_role?: string | null
          new_status?: string | null
          organization_id?: string
          person_id?: string
          previous_account_id?: string | null
          previous_note?: string | null
          previous_role?: string | null
          previous_status?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_events_actor_person_id_fkey"
            columns: ["actor_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          approved_account_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          organization_id: string
          person_id: string
          requested_at: string
          role: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_account_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          organization_id: string
          person_id: string
          requested_at?: string
          role?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_account_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          organization_id?: string
          person_id?: string
          requested_at?: string
          role?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_approved_account_belongs_to_person"
            columns: ["approved_account_id", "person_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id", "person_id"]
          },
          {
            foreignKeyName: "memberships_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          created_by: string | null
          deliverable_id: string | null
          id: string
          kind: string
          occurs_on: string
          organization_id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          id?: string
          kind?: string
          occurs_on: string
          organization_id: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          id?: string
          kind?: string
          occurs_on?: string
          organization_id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_deliverable_same_org"
            columns: ["deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "strategy_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "milestones_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      needs: {
        Row: {
          created_at: string
          created_by: string | null
          family: string
          id: string
          label: string
          organization_id: string
          project_id: string
          review_status: string
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          family: string
          id?: string
          label: string
          organization_id: string
          project_id: string
          review_status?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          family?: string
          id?: string
          label?: string
          organization_id?: string
          project_id?: string
          review_status?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "needs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "needs_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_person_id: string | null
          created_at: string
          id: string
          kind: string
          organization_id: string
          project_id: string | null
          push_claimed_at: string | null
          read_at: string | null
          recipient_person_id: string
          subject_id: string | null
        }
        Insert: {
          actor_person_id?: string | null
          created_at?: string
          id?: string
          kind: string
          organization_id: string
          project_id?: string | null
          push_claimed_at?: string | null
          read_at?: string | null
          recipient_person_id: string
          subject_id?: string | null
        }
        Update: {
          actor_person_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          project_id?: string | null
          push_claimed_at?: string | null
          read_at?: string | null
          recipient_person_id?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_person_id_fkey"
            columns: ["actor_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "notifications_recipient_person_id_fkey"
            columns: ["recipient_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      open_points: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string
          question: string
          resolution: string | null
          resolved_at: string | null
          source_report_item_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          question: string
          resolution?: string | null
          resolved_at?: string | null
          source_report_item_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          question?: string
          resolution?: string | null
          resolved_at?: string | null
          source_report_item_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_points_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_points_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "open_points_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          bootstrap_admin_email: string | null
          bootstrap_completed_at: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          bootstrap_admin_email?: string | null
          bootstrap_completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          bootstrap_admin_email?: string | null
          bootstrap_completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assigned_by: string | null
          assignee_person_id: string
          created_at: string
          id: string
          note: string | null
          organization_id: string
          project_id: string
          responded_at: string | null
          response: string | null
          status: string
        }
        Insert: {
          assigned_by?: string | null
          assignee_person_id: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id: string
          project_id: string
          responded_at?: string | null
          response?: string | null
          status?: string
        }
        Update: {
          assigned_by?: string | null
          assignee_person_id?: string
          created_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          project_id?: string
          responded_at?: string | null
          response?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_assignee_person_id_fkey"
            columns: ["assignee_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_creatives: {
        Row: {
          added_by: string | null
          created_at: string
          organization_id: string
          person_id: string
          project_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          organization_id: string
          person_id: string
          project_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          organization_id?: string
          person_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_creatives_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_drafts: {
        Row: {
          created_at: string
          created_by: string | null
          form_values: Json
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          form_values?: Json
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          form_values?: Json
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_masters: {
        Row: {
          created_at: string
          created_by: string | null
          master_id: string
          organization_id: string
          position: number
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          master_id: string
          organization_id: string
          position: number
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          master_id?: string
          organization_id?: string
          position?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_masters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_masters_master_same_org"
            columns: ["master_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "masters"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_masters_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_stages: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          project_id: string
          stage_definition_id: string
          state: string
          state_changed_at: string | null
          state_changed_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          project_id: string
          stage_definition_id: string
          state?: string
          state_changed_at?: string | null
          state_changed_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          stage_definition_id?: string
          state?: string
          state_changed_at?: string | null
          state_changed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_stages_stage_definition_id_fkey"
            columns: ["stage_definition_id"]
            isOneToOne: false
            referencedRelation: "stage_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_stages_state_changed_by_fkey"
            columns: ["state_changed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          organization_id: string
          person_id: string | null
          project_id: string
          review_status: string
          role: string | null
          role_key: string | null
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          organization_id: string
          person_id?: string | null
          project_id: string
          review_status?: string
          role?: string | null
          role_key?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          organization_id?: string
          person_id?: string | null
          project_id?: string
          review_status?: string
          role?: string | null
          role_key?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "team_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          artist_id: string | null
          budget_cents: number | null
          created_at: string
          created_by: string | null
          due_date: string | null
          framing_notes: string | null
          id: string
          organization_id: string
          owner_person_id: string | null
          priority: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          artist_id?: string | null
          budget_cents?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          framing_notes?: string | null
          id?: string
          organization_id: string
          owner_person_id?: string | null
          priority?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          artist_id?: string | null
          budget_cents?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          framing_notes?: string | null
          id?: string
          organization_id?: string
          owner_person_id?: string | null
          priority?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_artist_same_org"
            columns: ["artist_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          person_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          person_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      release_links: {
        Row: {
          first_seen_at: string
          id: string
          last_seen_at: string
          organization_id: string
          platform: string
          release_id: string
          source: string
          url: string
        }
        Insert: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          organization_id: string
          platform: string
          release_id: string
          source: string
          url: string
        }
        Update: {
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          organization_id?: string
          platform?: string
          release_id?: string
          source?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_links_release_same_org"
            columns: ["release_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      releases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          isrc: string | null
          last_checked_at: string | null
          online_detected_at: string | null
          organization_id: string
          planned_release_date: string | null
          project_id: string
          smartlink_enabled: boolean
          smartlink_token: string
          spotify_url: string | null
          title: string
          upc: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          isrc?: string | null
          last_checked_at?: string | null
          online_detected_at?: string | null
          organization_id: string
          planned_release_date?: string | null
          project_id: string
          smartlink_enabled?: boolean
          smartlink_token?: string
          spotify_url?: string | null
          title: string
          upc?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          isrc?: string | null
          last_checked_at?: string | null
          online_detected_at?: string | null
          organization_id?: string
          planned_release_date?: string | null
          project_id?: string
          smartlink_enabled?: boolean
          smartlink_token?: string
          spotify_url?: string | null
          title?: string
          upc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      report_items: {
        Row: {
          created_at: string
          end_seconds: number | null
          id: string
          kind: string
          located: string
          need_family: string | null
          organization_id: string
          position: number
          quote: string
          report_id: string
          search: unknown
          start_seconds: number | null
          what: string
          who: string | null
          why: string | null
        }
        Insert: {
          created_at?: string
          end_seconds?: number | null
          id?: string
          kind: string
          located: string
          need_family?: string | null
          organization_id: string
          position: number
          quote: string
          report_id: string
          search?: unknown
          start_seconds?: number | null
          what: string
          who?: string | null
          why?: string | null
        }
        Update: {
          created_at?: string
          end_seconds?: number | null
          id?: string
          kind?: string
          located?: string
          need_family?: string | null
          organization_id?: string
          position?: number
          quote?: string
          report_id?: string
          search?: unknown
          start_seconds?: number | null
          what?: string
          who?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_items_report_same_org"
            columns: ["report_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "call_reports"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          organization_id: string
          project_id: string
          revoked_at: string | null
          scope: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          revoked_at?: string | null
          scope: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          revoked_at?: string | null
          scope?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stage_definitions: {
        Row: {
          archived_at: string | null
          created_at: string
          deliverable: string | null
          id: string
          key: string
          label: string
          organization_id: string
          position: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          deliverable?: string | null
          id?: string
          key: string
          label: string
          organization_id: string
          position: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          deliverable?: string | null
          id?: string
          key?: string
          label?: string
          organization_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_deliverables: {
        Row: {
          assignee_person_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          lever_id: string
          organization_id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_person_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          lever_id: string
          organization_id: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_person_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          lever_id?: string
          organization_id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_deliverables_assignee_person_id_fkey"
            columns: ["assignee_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_deliverables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_deliverables_lever_same_org"
            columns: ["lever_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "levers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "strategy_deliverables_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_person_id: string
          created_at: string
          created_by: string | null
          done_at: string | null
          due_date: string
          id: string
          organization_id: string
          project_id: string
          source_report_item_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_person_id: string
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_date: string
          id?: string
          organization_id: string
          project_id: string
          source_report_item_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_person_id?: string
          created_at?: string
          created_by?: string | null
          done_at?: string | null
          due_date?: string
          id?: string
          organization_id?: string
          project_id?: string
          source_report_item_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_person_id_fkey"
            columns: ["assignee_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "tasks_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      transcripts: {
        Row: {
          call_id: string
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          language: string | null
          model: string
          organization_id: string
          processing_ms: number | null
          provider: string
          search: unknown
          segments: Json
          text: string
        }
        Insert: {
          call_id: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          model: string
          organization_id: string
          processing_ms?: number | null
          provider: string
          search?: unknown
          segments?: Json
          text: string
        }
        Update: {
          call_id?: string
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          model?: string
          organization_id?: string
          processing_ms?: number | null
          provider?: string
          search?: unknown
          segments?: Json
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "transcripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      validations: {
        Row: {
          decided_at: string | null
          decision_comment: string | null
          id: string
          organization_id: string
          project_stage_id: string
          request_note: string | null
          requested_at: string
          requested_by: string
          state: string
          validator_person_id: string
        }
        Insert: {
          decided_at?: string | null
          decision_comment?: string | null
          id?: string
          organization_id: string
          project_stage_id: string
          request_note?: string | null
          requested_at?: string
          requested_by: string
          state?: string
          validator_person_id: string
        }
        Update: {
          decided_at?: string | null
          decision_comment?: string | null
          id?: string
          organization_id?: string
          project_stage_id?: string
          request_note?: string | null
          requested_at?: string
          requested_by?: string
          state?: string
          validator_person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validations_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_stage_same_org"
            columns: ["project_stage_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "validations_validator_person_id_fkey"
            columns: ["validator_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_field_values: {
        Row: {
          created_at: string | null
          created_by: string | null
          deliverable: string | null
          field_key: string | null
          id: string | null
          organization_id: string | null
          project_id: string | null
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string | null
          status: string | null
          value: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "field_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_values_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "field_values_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
    }
    Functions: {
      add_project_creative: {
        Args: { p_person_id: string; p_project_id: string }
        Returns: undefined
      }
      audio_state_rank: { Args: { p_state: string }; Returns: number }
      auth_organization_id: { Args: never; Returns: string }
      auth_person_id: { Args: never; Returns: string }
      can_admin_person: { Args: { target_person_id: string }; Returns: boolean }
      can_deposit_design_version: {
        Args: { p_deliverable_id: string; p_project_id: string }
        Returns: boolean
      }
      can_manage_creatives: { Args: { p_project_id: string }; Returns: boolean }
      can_see_project: { Args: { p_project_id: string }; Returns: boolean }
      can_see_project_row: {
        Args: {
          p_organization_id: string
          p_owner_person_id: string
          p_project_id: string
        }
        Returns: boolean
      }
      can_view_person: { Args: { target_person_id: string }; Returns: boolean }
      claim_push_deliveries: {
        Args: { p_secret: string }
        Returns: {
          auth: string
          endpoint: string
          kind: string
          notification_id: string
          p256dh: string
          project_id: string
          recipient_person_id: string
          subject_id: string
        }[]
      }
      create_master: {
        Args: {
          p_audio_state?: string
          p_credits: Json
          p_duration_seconds?: number
          p_isrc?: string
          p_organization_id: string
          p_title: string
          p_variant?: string
          p_variant_label?: string
        }
        Returns: string
      }
      create_project: {
        Args: {
          p_assignee_person_id?: string
          p_budget_cents?: number
          p_creative_person_ids?: string[]
          p_due_date?: string
          p_framing_notes?: string
          p_master_ids?: string[]
          p_organization_id: string
          p_priority?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      decide_validation: {
        Args: {
          p_approve: boolean
          p_comment?: string
          p_validation_id: string
        }
        Returns: undefined
      }
      design_is_editable: { Args: { p_project_id: string }; Returns: boolean }
      design_is_in_progress: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      drop_gone_push_subscription: {
        Args: { p_endpoint: string; p_secret: string }
        Returns: undefined
      }
      edit_feedback_topic: {
        Args: {
          p_kind: string
          p_summary: string
          p_title: string
          p_topic: string
        }
        Returns: undefined
      }
      file_feedback: {
        Args: {
          p_feedback: string
          p_summary?: string
          p_title?: string
          p_topic?: string
        }
        Returns: string
      }
      forget_push_subscription: {
        Args: { p_endpoint: string }
        Returns: undefined
      }
      framing_is_editable: { Args: { p_project_id: string }; Returns: boolean }
      framing_is_open: { Args: { p_project_id: string }; Returns: boolean }
      get_my_access: { Args: never; Returns: Json }
      get_smartlink: { Args: { p_token: string }; Returns: Json }
      has_permission: {
        Args: { org_id: string; p_permission: string }
        Returns: boolean
      }
      invite_member: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_role: string
        }
        Returns: string
      }
      is_active_member: { Args: { org_id: string }; Returns: boolean }
      is_call_owner: { Args: { p_call_id: string }; Returns: boolean }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_project_launched: { Args: { p_project_id: string }; Returns: boolean }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
      list_assignable_people: {
        Args: { p_organization_id: string }
        Returns: {
          first_name: string
          last_name: string
          person_id: string
        }[]
      }
      list_creative_people: {
        Args: { p_organization_id: string }
        Returns: {
          first_name: string
          last_name: string
          person_id: string
        }[]
      }
      list_validators: {
        Args: { p_organization_id: string }
        Returns: {
          first_name: string
          last_name: string
          person_id: string
        }[]
      }
      log_artist_event: {
        Args: {
          p_artist_id: string
          p_catalog_only?: boolean
          p_detail: Json
          p_kind: string
          p_organization_id: string
          p_project_id?: string
          p_subject_id: string
        }
        Returns: undefined
      }
      log_master_event: {
        Args: {
          p_catalog_only?: boolean
          p_detail: Json
          p_kind: string
          p_master_id: string
          p_organization_id: string
          p_project_id?: string
          p_subject_id: string
        }
        Returns: undefined
      }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      master_is_live: { Args: { p_master_id: string }; Returns: boolean }
      normalize_email: { Args: { input: string }; Returns: string }
      notify: {
        Args: {
          p_kind: string
          p_organization_id: string
          p_project_id: string
          p_recipient_person_id: string
          p_subject_id: string
        }
        Returns: undefined
      }
      person_has_permission: {
        Args: {
          p_organization_id: string
          p_permission: string
          p_person_id: string
        }
        Returns: boolean
      }
      project_artist_name: { Args: { p_project_id: string }; Returns: string }
      project_masters_editable: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      push_secret_matches: { Args: { p_secret: string }; Returns: boolean }
      record_feedback_notion: {
        Args: { p_page_id: string; p_topic: string; p_url?: string }
        Returns: undefined
      }
      record_feedback_notion_error: {
        Args: { p_error: string; p_topic: string }
        Returns: undefined
      }
      record_release_detection: {
        Args: { p_links: Json; p_release_id: string }
        Returns: Json
      }
      remove_project_creative: {
        Args: { p_person_id: string; p_project_id: string }
        Returns: undefined
      }
      request_validation: {
        Args: { p_note?: string; p_stage_id: string }
        Returns: string
      }
      respond_to_assignment: {
        Args: {
          p_assignment_id: string
          p_decision: string
          p_response?: string
        }
        Returns: undefined
      }
      review_design_version: {
        Args: { p_approve: boolean; p_comment?: string; p_version_id: string }
        Returns: undefined
      }
      review_feedback_topic: {
        Args: { p_action: string; p_priority?: string; p_topic: string }
        Returns: undefined
      }
      role_permissions: { Args: { p_role: string }; Returns: string[] }
      save_call_report: {
        Args: {
          p_call_id: string
          p_input_tokens?: number
          p_items: Json
          p_model: string
          p_output_tokens?: number
          p_processing_ms?: number
          p_provider: string
          p_summary: string
          p_transcript_id: string
        }
        Returns: string
      }
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: undefined
      }
      search_calls: {
        Args: { p_project_id?: string; p_query: string }
        Returns: {
          call_id: string
          call_title: string
          excerpt: string
          kind: string
          project_id: string
          project_title: string
          quote: string
          rank: number
          source: string
          start_seconds: number
        }[]
      }
      search_projects: {
        Args: { p_query: string }
        Returns: {
          artist: string
          id: string
          score: number
          title: string
        }[]
      }
      set_artist_archived: {
        Args: { p_archived: boolean; p_artist_id: string }
        Returns: undefined
      }
      set_master_archived: {
        Args: { p_archived: boolean; p_master_id: string }
        Returns: undefined
      }
      set_project_archived: {
        Args: { p_archived: boolean; p_project_id: string }
        Returns: undefined
      }
      sole_validator: { Args: { p_organization_id: string }; Returns: string }
      start_framing_without_call: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      start_stage: { Args: { p_stage_id: string }; Returns: undefined }
      strategy_is_editable: { Args: { p_project_id: string }; Returns: boolean }
      transmit_project: {
        Args: {
          p_assignee_person_id: string
          p_note?: string
          p_project_id: string
        }
        Returns: string
      }
      try_uuid: { Args: { input: string }; Returns: string }
      update_master: {
        Args: {
          p_audio_state?: string
          p_credits: Json
          p_duration_seconds?: number
          p_isrc?: string
          p_master_id: string
          p_title: string
          p_variant?: string
          p_variant_label?: string
        }
        Returns: undefined
      }
      update_project: {
        Args: {
          p_budget_cents?: number
          p_due_date?: string
          p_framing_notes?: string
          p_master_ids?: string[]
          p_priority?: string
          p_project_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      usable_admin_count: {
        Args: {
          exclude_account_id?: string
          exclude_membership_id?: string
          org_id: string
        }
        Returns: number
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

