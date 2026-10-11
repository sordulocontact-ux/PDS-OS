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
      distribution_closures: {
        Row: {
          arbitration: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          kind: string
          organization_id: string
          project_id: string
          proposed_at: string
          proposed_by: string
          reopen_note: string | null
          reopened_at: string | null
          reopened_by: string | null
          reserves: Json
          status: string
          validator_person_id: string
          version_number: number
        }
        Insert: {
          arbitration?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          kind: string
          organization_id: string
          project_id: string
          proposed_at?: string
          proposed_by: string
          reopen_note?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          reserves?: Json
          status?: string
          validator_person_id: string
          version_number: number
        }
        Update: {
          arbitration?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          kind?: string
          organization_id?: string
          project_id?: string
          proposed_at?: string
          proposed_by?: string
          reopen_note?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          reserves?: Json
          status?: string
          validator_person_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribution_closures_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_closures_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "distribution_closures_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_closures_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_closures_validator_person_id_fkey"
            columns: ["validator_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_anomalies: {
        Row: {
          description: string
          id: string
          kind: string
          organization_id: string
          platform: string | null
          project_id: string
          reported_at: string
          reported_by: string
          severity: string
          source_module: string
          state: string
          state_at: string | null
          state_by: string | null
          state_note: string | null
          version_number: number | null
        }
        Insert: {
          description: string
          id?: string
          kind: string
          organization_id: string
          platform?: string | null
          project_id: string
          reported_at?: string
          reported_by: string
          severity: string
          source_module: string
          state?: string
          state_at?: string | null
          state_by?: string | null
          state_note?: string | null
          version_number?: number | null
        }
        Update: {
          description?: string
          id?: string
          kind?: string
          organization_id?: string
          platform?: string | null
          project_id?: string
          reported_at?: string
          reported_by?: string
          severity?: string
          source_module?: string
          state?: string
          state_at?: string | null
          state_by?: string | null
          state_note?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_anomalies_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "distribution_anomalies_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_anomalies_state_by_fkey"
            columns: ["state_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_platforms: {
        Row: {
          available_declared_at: string | null
          available_declared_by: string | null
          compliance: string
          compliance_at: string | null
          compliance_by: string | null
          compliance_note: string | null
          created_at: string
          id: string
          label: string | null
          organization_id: string
          platform: string
          project_id: string
          updated_at: string
          url: string | null
          verification: string
          verification_note: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          available_declared_at?: string | null
          available_declared_by?: string | null
          compliance?: string
          compliance_at?: string | null
          compliance_by?: string | null
          compliance_note?: string | null
          created_at?: string
          id?: string
          label?: string | null
          organization_id: string
          platform: string
          project_id: string
          updated_at?: string
          url?: string | null
          verification?: string
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          available_declared_at?: string | null
          available_declared_by?: string | null
          compliance?: string
          compliance_at?: string | null
          compliance_by?: string | null
          compliance_note?: string | null
          created_at?: string
          id?: string
          label?: string | null
          organization_id?: string
          platform?: string
          project_id?: string
          updated_at?: string
          url?: string | null
          verification?: string
          verification_note?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_platforms_available_declared_by_fkey"
            columns: ["available_declared_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_platforms_compliance_by_fkey"
            columns: ["compliance_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_platforms_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "distribution_platforms_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_declarations: {
        Row: {
          declared_at: string
          declared_by: string
          declared_on: string | null
          id: string
          kind: string
          note: string | null
          orchard_id: string | null
          organization_id: string
          project_id: string
          proof_name: string | null
          proof_path: string | null
          proof_url: string | null
          version_number: number
          withdraw_note: string | null
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Insert: {
          declared_at?: string
          declared_by: string
          declared_on?: string | null
          id?: string
          kind: string
          note?: string | null
          orchard_id?: string | null
          organization_id: string
          project_id: string
          proof_name?: string | null
          proof_path?: string | null
          proof_url?: string | null
          version_number: number
          withdraw_note?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Update: {
          declared_at?: string
          declared_by?: string
          declared_on?: string | null
          id?: string
          kind?: string
          note?: string | null
          orchard_id?: string | null
          organization_id?: string
          project_id?: string
          proof_name?: string | null
          proof_path?: string | null
          proof_url?: string | null
          version_number?: number
          withdraw_note?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_declarations_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_declarations_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "distribution_declarations_version"
            columns: ["project_id", "version_number"]
            isOneToOne: false
            referencedRelation: "distribution_versions"
            referencedColumns: ["project_id", "number"]
          },
          {
            foreignKeyName: "distribution_declarations_withdrawn_by_fkey"
            columns: ["withdrawn_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_versions: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          number: number
          organization_id: string
          project_id: string
          snapshot: Json
          status: string
          submitted_at: string
          submitted_by: string
          superseded_at: string | null
          validator_person_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          number: number
          organization_id: string
          project_id: string
          snapshot: Json
          status?: string
          submitted_at?: string
          submitted_by: string
          superseded_at?: string | null
          validator_person_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          number?: number
          organization_id?: string
          project_id?: string
          snapshot?: Json
          status?: string
          submitted_at?: string
          submitted_by?: string
          superseded_at?: string | null
          validator_person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_versions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_versions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "distribution_versions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_versions_validator_person_id_fkey"
            columns: ["validator_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_checks: {
        Row: {
          check_key: string
          checked_at: string | null
          checked_by: string | null
          id: string
          note: string | null
          organization_id: string
          project_id: string
          result: string
        }
        Insert: {
          check_key: string
          checked_at?: string | null
          checked_by?: string | null
          id?: string
          note?: string | null
          organization_id: string
          project_id: string
          result?: string
        }
        Update: {
          check_key?: string
          checked_at?: string | null
          checked_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          project_id?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_checks_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
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
          contact_id: string | null
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
          contact_id?: string | null
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
          contact_id?: string | null
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
            foreignKeyName: "artist_contacts_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
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
          description: string | null
          file_name: string
          id: string
          mime: string
          organization_id: string
          path: string
          replaces_id: string | null
          series_id: string
          version: number
        }
        Insert: {
          artist_id: string
          bytes: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          id?: string
          mime: string
          organization_id: string
          path: string
          replaces_id?: string | null
          series_id?: string
          version?: number
        }
        Update: {
          artist_id?: string
          bytes?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          id?: string
          mime?: string
          organization_id?: string
          path?: string
          replaces_id?: string | null
          series_id?: string
          version?: number
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
          master_role: string | null
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
          master_role?: string | null
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
          master_role?: string | null
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
      call_attendees: {
        Row: {
          call_id: string
          created_at: string
          organization_id: string
          person_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          organization_id: string
          person_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          organization_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_attendees_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "call_attendees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      call_guests: {
        Row: {
          call_id: string
          contact_id: string | null
          created_at: string
          email: string
          name: string | null
          organization_id: string
        }
        Insert: {
          call_id: string
          contact_id?: string | null
          created_at?: string
          email: string
          name?: string | null
          organization_id: string
        }
        Update: {
          call_id?: string
          contact_id?: string | null
          created_at?: string
          email?: string
          name?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_guests_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "call_guests_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
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
          ends_at: string | null
          error_code: string | null
          google_event_id: string | null
          id: string
          meeting_url: string | null
          occurred_at: string
          organization_id: string
          prep: Json | null
          project_id: string | null
          purpose: string | null
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
          ends_at?: string | null
          error_code?: string | null
          google_event_id?: string | null
          id?: string
          meeting_url?: string | null
          occurred_at?: string
          organization_id: string
          prep?: Json | null
          project_id?: string | null
          purpose?: string | null
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
          ends_at?: string | null
          error_code?: string | null
          google_event_id?: string | null
          id?: string
          meeting_url?: string | null
          occurred_at?: string
          organization_id?: string
          prep?: Json | null
          project_id?: string | null
          purpose?: string | null
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
      content_formats: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_formats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_formats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_legal_details: {
        Row: {
          contact_id: string
          definition_version: number
          details: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          definition_version?: number
          details?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          definition_version?: number
          details?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_documents: {
        Row: {
          body: string
          comment: string | null
          contract_id: string
          created_at: string
          created_by: string | null
          fields: Json
          id: string
          organization_id: string
          template_id: string
          template_version: number
          version: number
        }
        Insert: {
          body: string
          comment?: string | null
          contract_id: string
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          organization_id: string
          template_id: string
          template_version: number
          version: number
        }
        Update: {
          body?: string
          comment?: string | null
          contract_id?: string
          created_at?: string
          created_by?: string | null
          fields?: Json
          id?: string
          organization_id?: string
          template_id?: string
          template_version?: number
          version?: number
        }
        Relationships: []
      }
      contract_events: {
        Row: {
          actor_person_id: string | null
          contract_id: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          organization_id: string
          project_id: string | null
        }
        Insert: {
          actor_person_id?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          organization_id: string
          project_id?: string | null
        }
        Update: {
          actor_person_id?: string | null
          contract_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          organization_id?: string
          project_id?: string | null
        }
        Relationships: []
      }
      contract_files: {
        Row: {
          bytes: number
          category: string
          contract_id: string
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string
          id: string
          mime: string
          organization_id: string
          path: string
          replaces_id: string | null
          series_id: string
          version: number
        }
        Insert: {
          bytes: number
          category?: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          id?: string
          mime: string
          organization_id: string
          path: string
          replaces_id?: string | null
          series_id?: string
          version?: number
        }
        Update: {
          bytes?: number
          category?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          id?: string
          mime?: string
          organization_id?: string
          path?: string
          replaces_id?: string | null
          series_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_files_contract_same_org"
            columns: ["contract_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "contract_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_parties: {
        Row: {
          contact_id: string
          contract_id: string
          created_at: string
          organization_id: string
          role: string | null
        }
        Insert: {
          contact_id: string
          contract_id: string
          created_at?: string
          organization_id: string
          role?: string | null
        }
        Update: {
          contact_id?: string
          contract_id?: string
          created_at?: string
          organization_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_parties_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "contract_parties_contract_same_org"
            columns: ["contract_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          fields: string[]
          id: string
          name: string
          organization_id: string
          retired_at: string | null
          roles: string[]
          series_id: string
          source_name: string | null
          source_path: string | null
          status: string
          type: string
          usage: string | null
          validated_at: string | null
          validated_by: string | null
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          fields?: string[]
          id?: string
          name: string
          organization_id: string
          retired_at?: string | null
          roles: string[]
          series_id: string
          source_name?: string | null
          source_path?: string | null
          status?: string
          type: string
          usage?: string | null
          validated_at?: string | null
          validated_by?: string | null
          version: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          fields?: string[]
          id?: string
          name?: string
          organization_id?: string
          retired_at?: string | null
          roles?: string[]
          series_id?: string
          source_name?: string | null
          source_path?: string | null
          status?: string
          type?: string
          usage?: string | null
          validated_at?: string | null
          validated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          artist_id: string | null
          created_at: string
          created_by: string | null
          due_on: string | null
          ends_on: string | null
          id: string
          notes: string | null
          organization_id: string
          owner_person_id: string
          project_id: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signed_on: string | null
          starts_on: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          ends_on?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          owner_person_id: string
          project_id?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_on?: string | null
          starts_on?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          ends_on?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          owner_person_id?: string
          project_id?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signed_on?: string | null
          starts_on?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_artist_same_org"
            columns: ["artist_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "contracts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_deliveries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          checked_at: string | null
          checked_by: string | null
          deliverable_id: string
          delivered_at: string | null
          delivered_by: string | null
          final_note: string | null
          final_set_at: string
          final_set_by: string | null
          final_url: string | null
          id: string
          organization_id: string
          project_id: string
          version_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          deliverable_id: string
          delivered_at?: string | null
          delivered_by?: string | null
          final_note?: string | null
          final_set_at?: string
          final_set_by?: string | null
          final_url?: string | null
          id?: string
          organization_id: string
          project_id: string
          version_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          deliverable_id?: string
          delivered_at?: string | null
          delivered_by?: string | null
          final_note?: string | null
          final_set_at?: string
          final_set_by?: string | null
          final_url?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_deliveries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_deliveries_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_deliveries_deliverable_same_org"
            columns: ["deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "strategy_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "deliverable_deliveries_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_deliveries_final_set_by_fkey"
            columns: ["final_set_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_deliveries_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "deliverable_deliveries_version_same_org"
            columns: ["version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_calls: {
        Row: {
          call_id: string
          created_at: string
          deliverable_ids: string[]
          document_ids: string[]
          format: string
          organization_id: string
          participants: Json
          project_id: string
          purpose: string
        }
        Insert: {
          call_id: string
          created_at?: string
          deliverable_ids?: string[]
          document_ids?: string[]
          format: string
          organization_id: string
          participants?: Json
          project_id: string
          purpose: string
        }
        Update: {
          call_id?: string
          created_at?: string
          deliverable_ids?: string[]
          document_ids?: string[]
          format?: string
          organization_id?: string
          participants?: Json
          project_id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_calls_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_calls_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_deliverables: {
        Row: {
          call_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lever_id: string | null
          note: string | null
          organization_id: string
          origin: string
          project_id: string
          status: string
          strategy_deliverable_id: string | null
          title: string | null
        }
        Insert: {
          call_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lever_id?: string | null
          note?: string | null
          organization_id: string
          origin: string
          project_id: string
          status?: string
          strategy_deliverable_id?: string | null
          title?: string | null
        }
        Update: {
          call_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lever_id?: string | null
          note?: string | null
          organization_id?: string
          origin?: string
          project_id?: string
          status?: string
          strategy_deliverable_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_deliverables_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_deliverables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_deliverables_lever_same_org"
            columns: ["lever_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "levers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_deliverables_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_deliverables_strategy_same_org"
            columns: ["strategy_deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "strategy_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_intentions: {
        Row: {
          created_at: string
          created_by: string | null
          design_deliverable_id: string | null
          id: string
          merged_into: string | null
          organization_id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          source_quote: string | null
          source_report_item_id: string | null
          source_type: string
          split_from: string | null
          status: string
          target: string
          topic: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          design_deliverable_id?: string | null
          id?: string
          merged_into?: string | null
          organization_id: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_type?: string
          split_from?: string | null
          status?: string
          target: string
          topic: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          design_deliverable_id?: string | null
          id?: string
          merged_into?: string | null
          organization_id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_type?: string
          split_from?: string | null
          status?: string
          target?: string
          topic?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_intentions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_intentions_deliverable_same_org"
            columns: ["design_deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_intentions_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_intentions_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "design_intentions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_intentions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_intentions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_intentions_source_same_org"
            columns: ["source_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_sources"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_intentions_split_from_fkey"
            columns: ["split_from"]
            isOneToOne: false
            referencedRelation: "design_intentions"
            referencedColumns: ["id"]
          },
        ]
      }
      design_references: {
        Row: {
          bytes: number | null
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          kind: string
          mime: string | null
          note: string | null
          organization_id: string
          path: string | null
          project_id: string
          sha256: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          kind?: string
          mime?: string | null
          note?: string | null
          organization_id: string
          path?: string | null
          project_id: string
          sha256?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          bytes?: number | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          kind?: string
          mime?: string | null
          note?: string | null
          organization_id?: string
          path?: string | null
          project_id?: string
          sha256?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_references_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_references_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_sources: {
        Row: {
          body: string | null
          call_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          organization_id: string
          project_id: string
          title: string
        }
        Insert: {
          body?: string | null
          call_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          organization_id: string
          project_id: string
          title: string
        }
        Update: {
          body?: string | null
          call_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          organization_id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_sources_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_sources_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_workspaces: {
        Row: {
          organization_id: string
          project_id: string
          started_at: string
          started_by: string | null
          validation_mode: string
        }
        Insert: {
          organization_id: string
          project_id: string
          started_at?: string
          started_by?: string | null
          validation_mode?: string
        }
        Update: {
          organization_id?: string
          project_id?: string
          started_at?: string
          started_by?: string | null
          validation_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_workspaces_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_workspaces_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      design_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          ended_at: string | null
          id: string
          organization_id: string
          person_id: string
          project_id: string
          scope: string
          sheet_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          ended_at?: string | null
          id?: string
          organization_id: string
          person_id: string
          project_id: string
          scope: string
          sheet_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          ended_at?: string | null
          id?: string
          organization_id?: string
          person_id?: string
          project_id?: string
          scope?: string
          sheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_assignments_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_assignments_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_briefs: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          number: number
          organization_id: string
          project_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          number: number
          organization_id: string
          project_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          number?: number
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_briefs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_briefs_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_decisions: {
        Row: {
          comment: string | null
          decided_at: string
          decided_by: string | null
          decision: string
          id: string
          organization_id: string
          project_id: string
          section: string
          submission_id: string
        }
        Insert: {
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          decision: string
          id?: string
          organization_id: string
          project_id: string
          section?: string
          submission_id: string
        }
        Update: {
          comment?: string | null
          decided_at?: string
          decided_by?: string | null
          decision?: string
          id?: string
          organization_id?: string
          project_id?: string
          section?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_decisions_submission_same_org"
            columns: ["submission_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_submissions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_events: {
        Row: {
          actor: string | null
          created_at: string
          data: Json
          id: string
          kind: string
          organization_id: string
          project_id: string
          sheet_id: string | null
          subject_id: string | null
        }
        Insert: {
          actor?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind: string
          organization_id: string
          project_id: string
          sheet_id?: string | null
          subject_id?: string | null
        }
        Update: {
          actor?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          organization_id?: string
          project_id?: string
          sheet_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_events_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_events_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_handoffs: {
        Row: {
          brief_id: string | null
          confirmed_at: string
          confirmed_by: string | null
          id: string
          organization_id: string
          project_id: string
          sheet_id: string
          submission_id: string
        }
        Insert: {
          brief_id?: string | null
          confirmed_at?: string
          confirmed_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          sheet_id: string
          submission_id: string
        }
        Update: {
          brief_id?: string | null
          confirmed_at?: string
          confirmed_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          sheet_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_handoffs_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "design_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_handoffs_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_handoffs_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_handoffs_submission_same_org"
            columns: ["submission_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_submissions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_intent_confirmations: {
        Row: {
          confirmed_at: string
          confirmed_by: string | null
          design_deliverable_id: string | null
          id: string
          organization_id: string
          project_id: string
          snapshot: Json
          target: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by?: string | null
          design_deliverable_id?: string | null
          id?: string
          organization_id: string
          project_id: string
          snapshot: Json
          target: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string | null
          design_deliverable_id?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          snapshot?: Json
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_intent_confirmations_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_intent_confirmations_deliverable_same_org"
            columns: ["design_deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_intent_confirmations_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_reference_links: {
        Row: {
          created_at: string
          created_by: string | null
          design_deliverable_id: string | null
          id: string
          organization_id: string
          project_id: string
          reference_id: string
          target: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          design_deliverable_id?: string | null
          id?: string
          organization_id: string
          project_id: string
          reference_id: string
          target: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          design_deliverable_id?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          reference_id?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_reference_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_reference_links_deliverable_same_org"
            columns: ["design_deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_reference_links_reference_same_org"
            columns: ["reference_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_references"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_sheet_items: {
        Row: {
          created_at: string
          delivery_date: string | null
          id: string
          notes: string | null
          number: number
          objective: string | null
          organization_id: string
          project_id: string
          sheet_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          number: number
          objective?: string | null
          organization_id: string
          project_id: string
          sheet_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          number?: number
          objective?: string | null
          organization_id?: string
          project_id?: string
          sheet_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_sheet_items_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      design_sheets: {
        Row: {
          budget_cents: number | null
          budget_state: string
          concept: string | null
          constraints: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          dependencies: string | null
          design_deliverable_id: string
          duration_max_seconds: number | null
          duration_min_seconds: number | null
          id: string
          intention: string | null
          kind: string
          notes: string | null
          organization_id: string
          post_deadline: string | null
          post_start: string | null
          production_notes: string | null
          project_id: string
          provenance: Json
          ratios: string[]
          shoot_date: string | null
          subtitle_mode: string | null
          subtitle_ratios: string[]
          subtitles: boolean | null
          title: string
          updated_at: string
          updated_by: string | null
          variants: string | null
        }
        Insert: {
          budget_cents?: number | null
          budget_state?: string
          concept?: string | null
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          dependencies?: string | null
          design_deliverable_id: string
          duration_max_seconds?: number | null
          duration_min_seconds?: number | null
          id?: string
          intention?: string | null
          kind?: string
          notes?: string | null
          organization_id: string
          post_deadline?: string | null
          post_start?: string | null
          production_notes?: string | null
          project_id: string
          provenance?: Json
          ratios?: string[]
          shoot_date?: string | null
          subtitle_mode?: string | null
          subtitle_ratios?: string[]
          subtitles?: boolean | null
          title: string
          updated_at?: string
          updated_by?: string | null
          variants?: string | null
        }
        Update: {
          budget_cents?: number | null
          budget_state?: string
          concept?: string | null
          constraints?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          dependencies?: string | null
          design_deliverable_id?: string
          duration_max_seconds?: number | null
          duration_min_seconds?: number | null
          id?: string
          intention?: string | null
          kind?: string
          notes?: string | null
          organization_id?: string
          post_deadline?: string | null
          post_start?: string | null
          production_notes?: string | null
          project_id?: string
          provenance?: Json
          ratios?: string[]
          shoot_date?: string | null
          subtitle_mode?: string | null
          subtitle_ratios?: string[]
          subtitles?: boolean | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          variants?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_sheets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_sheets_deliverable_same_org"
            columns: ["design_deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_sheets_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_sheets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      design_submissions: {
        Row: {
          closed_at: string | null
          id: string
          kind: string
          mode: string
          number: number
          organization_id: string
          project_id: string
          sections: string[]
          sheet_id: string | null
          snapshot: Json
          status: string
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          closed_at?: string | null
          id?: string
          kind: string
          mode: string
          number?: number
          organization_id: string
          project_id: string
          sections: string[]
          sheet_id?: string | null
          snapshot: Json
          status?: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          closed_at?: string | null
          id?: string
          kind?: string
          mode?: string
          number?: number
          organization_id?: string
          project_id?: string
          sections?: string[]
          sheet_id?: string | null
          snapshot?: Json
          status?: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_submissions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_submissions_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      design_validators: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          organization_id: string
          person_id: string
          project_id: string
          scope: string
          sheet_id: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          person_id: string
          project_id: string
          scope: string
          sheet_id?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          person_id?: string
          project_id?: string
          scope?: string
          sheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_validators_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_validators_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_validators_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "design_validators_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_sheets"
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
      distribution_dossiers: {
        Row: {
          cover_sheet_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          prelisten: boolean | null
          prelisten_on: string | null
          preorder: boolean | null
          preorder_on: string | null
          price_tier: string | null
          project_id: string
          territories: string[]
          territory_mode: string
          updated_at: string
          validator_person_id: string | null
        }
        Insert: {
          cover_sheet_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          prelisten?: boolean | null
          prelisten_on?: string | null
          preorder?: boolean | null
          preorder_on?: string | null
          price_tier?: string | null
          project_id: string
          territories?: string[]
          territory_mode?: string
          updated_at?: string
          validator_person_id?: string | null
        }
        Update: {
          cover_sheet_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          prelisten?: boolean | null
          prelisten_on?: string | null
          preorder?: boolean | null
          preorder_on?: string | null
          price_tier?: string | null
          project_id?: string
          territories?: string[]
          territory_mode?: string
          updated_at?: string
          validator_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_dossiers_cover_same_org"
            columns: ["cover_sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "design_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "distribution_dossiers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_dossiers_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "distribution_dossiers_validator_person_id_fkey"
            columns: ["validator_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_events: {
        Row: {
          actor: string | null
          created_at: string
          data: Json
          id: string
          kind: string
          organization_id: string
          project_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind: string
          organization_id: string
          project_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_events_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_events_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
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
          source_label: string | null
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
          source_label?: string | null
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
          source_label?: string | null
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
      financial_needs: {
        Row: {
          amount_cents: number
          contact_id: string
          contract_id: string
          created_at: string
          currency: string
          id: string
          organization_id: string
          project_id: string | null
          status: string
        }
        Insert: {
          amount_cents: number
          contact_id: string
          contract_id: string
          created_at?: string
          currency?: string
          id?: string
          organization_id: string
          project_id?: string | null
          status?: string
        }
        Update: {
          amount_cents?: number
          contact_id?: string
          contract_id?: string
          created_at?: string
          currency?: string
          id?: string
          organization_id?: string
          project_id?: string | null
          status?: string
        }
        Relationships: []
      }
      framing_briefs: {
        Row: {
          change_comment: string | null
          content: Json
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          organization_id: string
          project_id: string
          reopened_dimensions: string[] | null
          sent_at: string | null
          state: string
          validation_id: string | null
          version: number
        }
        Insert: {
          change_comment?: string | null
          content: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          reopened_dimensions?: string[] | null
          sent_at?: string | null
          state?: string
          validation_id?: string | null
          version: number
        }
        Update: {
          change_comment?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          reopened_dimensions?: string[] | null
          sent_at?: string | null
          state?: string
          validation_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "framing_briefs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framing_briefs_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framing_briefs_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "framing_briefs_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "validations"
            referencedColumns: ["id"]
          },
        ]
      }
      framing_calls: {
        Row: {
          call_id: string
          created_at: string
          document_ids: string[]
          organization_id: string
          participants: Json
          project_id: string
          purpose: string
        }
        Insert: {
          call_id: string
          created_at?: string
          document_ids?: string[]
          organization_id: string
          participants?: Json
          project_id: string
          purpose: string
        }
        Update: {
          call_id?: string
          created_at?: string
          document_ids?: string[]
          organization_id?: string
          participants?: Json
          project_id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "framing_calls_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "framing_calls_project_same_org"
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
          source_label: string | null
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
          source_label?: string | null
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
          source_label?: string | null
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
      framing_deadlines: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          kind: string
          label: string | null
          organization_id: string
          project_id: string
          review_status: string
          source_label: string | null
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind: string
          label?: string | null
          organization_id: string
          project_id: string
          review_status?: string
          source_label?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          kind?: string
          label?: string | null
          organization_id?: string
          project_id?: string
          review_status?: string
          source_label?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framing_deadlines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framing_deadlines_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "framing_deadlines_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      legal_agreement_needs: {
        Row: {
          approved_at: string
          approved_by: string | null
          contact_id: string
          contract_id: string | null
          contract_type: string
          created_at: string
          fee_cents: number | null
          id: string
          organization_id: string
          project_id: string
          roles: string[]
          template_id: string | null
        }
        Insert: {
          approved_at?: string
          approved_by?: string | null
          contact_id: string
          contract_id?: string | null
          contract_type: string
          created_at?: string
          fee_cents?: number | null
          id?: string
          organization_id: string
          project_id: string
          roles?: string[]
          template_id?: string | null
        }
        Update: {
          approved_at?: string
          approved_by?: string | null
          contact_id?: string
          contract_id?: string | null
          contract_type?: string
          created_at?: string
          fee_cents?: number | null
          id?: string
          organization_id?: string
          project_id?: string
          roles?: string[]
          template_id?: string | null
        }
        Relationships: []
      }
      legal_answers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          intake_id: string
          master_id: string | null
          organization_id: string
          project_id: string
          question_key: string
          text: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          intake_id: string
          master_id?: string | null
          organization_id: string
          project_id: string
          question_key: string
          text: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          intake_id?: string
          master_id?: string | null
          organization_id?: string
          project_id?: string
          question_key?: string
          text?: string
        }
        Relationships: []
      }
      legal_clearance_communications: {
        Row: {
          body: string
          clearance_id: string
          created_at: string
          created_by: string | null
          direction: string
          id: string
          kind: string
          occurred_at: string
          organization_id: string
        }
        Insert: {
          body: string
          clearance_id: string
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          kind: string
          occurred_at?: string
          organization_id: string
        }
        Update: {
          body?: string
          clearance_id?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          kind?: string
          occurred_at?: string
          organization_id?: string
        }
        Relationships: []
      }
      legal_clearance_contracts: {
        Row: {
          clearance_id: string
          contract_id: string
          created_at: string
          organization_id: string
          right: string
        }
        Insert: {
          clearance_id: string
          contract_id: string
          created_at?: string
          organization_id: string
          right: string
        }
        Update: {
          clearance_id?: string
          contract_id?: string
          created_at?: string
          organization_id?: string
          right?: string
        }
        Relationships: []
      }
      legal_clearance_events: {
        Row: {
          actor_person_id: string | null
          clearance_id: string
          created_at: string
          from_status: string | null
          id: string
          kind: string
          note: string | null
          organization_id: string
          to_status: string | null
        }
        Insert: {
          actor_person_id?: string | null
          clearance_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          kind: string
          note?: string | null
          organization_id: string
          to_status?: string | null
        }
        Update: {
          actor_person_id?: string | null
          clearance_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          kind?: string
          note?: string | null
          organization_id?: string
          to_status?: string | null
        }
        Relationships: []
      }
      legal_clearance_rightsholders: {
        Row: {
          clearance_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          right: string
          role: string
        }
        Insert: {
          clearance_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          right: string
          role: string
        }
        Update: {
          clearance_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          right?: string
          role?: string
        }
        Relationships: []
      }
      legal_clearance_terms: {
        Row: {
          amount_cents: number | null
          clearance_id: string
          communication_id: string | null
          created_at: string
          created_by: string | null
          credits: string | null
          decided_at: string | null
          decided_by: string | null
          duration: string | null
          id: string
          organization_id: string
          other: string | null
          right: string | null
          share: string | null
          status: string
          territory: string | null
        }
        Insert: {
          amount_cents?: number | null
          clearance_id: string
          communication_id?: string | null
          created_at?: string
          created_by?: string | null
          credits?: string | null
          decided_at?: string | null
          decided_by?: string | null
          duration?: string | null
          id?: string
          organization_id: string
          other?: string | null
          right?: string | null
          share?: string | null
          status?: string
          territory?: string | null
        }
        Update: {
          amount_cents?: number | null
          clearance_id?: string
          communication_id?: string | null
          created_at?: string
          created_by?: string | null
          credits?: string | null
          decided_at?: string | null
          decided_by?: string | null
          duration?: string | null
          id?: string
          organization_id?: string
          other?: string | null
          right?: string | null
          share?: string | null
          status?: string
          territory?: string | null
        }
        Relationships: []
      }
      legal_clearances: {
        Row: {
          author: string | null
          created_at: string
          created_by: string | null
          element: string
          id: string
          master_id: string | null
          organization_id: string
          qualified_at: string | null
          project_id: string
          rights_scope: string | null
          scope_reason: string | null
          responsible_person_id: string | null
          source_fact_id: string | null
          status: string
          updated_at: string
          usage: string | null
          work: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          created_by?: string | null
          element: string
          id?: string
          master_id?: string | null
          organization_id: string
          qualified_at?: string | null
          project_id: string
          rights_scope?: string | null
          scope_reason?: string | null
          responsible_person_id?: string | null
          source_fact_id?: string | null
          status?: string
          updated_at?: string
          usage?: string | null
          work: string
        }
        Update: {
          author?: string | null
          created_at?: string
          created_by?: string | null
          element?: string
          id?: string
          master_id?: string | null
          organization_id?: string
          qualified_at?: string | null
          project_id?: string
          rights_scope?: string | null
          scope_reason?: string | null
          responsible_person_id?: string | null
          source_fact_id?: string | null
          status?: string
          updated_at?: string
          usage?: string | null
          work?: string
        }
        Relationships: []
      }
      legal_facts: {
        Row: {
          answer_id: string | null
          confirmed_by: string | null
          created_at: string
          declared_by: string | null
          effective_at: string
          evidence_id: string | null
          id: string
          intake_id: string
          kind: string
          master_id: string | null
          organization_id: string
          project_id: string
          question_key: string
          source_quote: string | null
          source_type: string
          status: string
          superseded_by_answer_id: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          answer_id?: string | null
          confirmed_by?: string | null
          created_at?: string
          declared_by?: string | null
          effective_at?: string
          evidence_id?: string | null
          id?: string
          intake_id: string
          kind: string
          master_id?: string | null
          organization_id: string
          project_id: string
          question_key: string
          source_quote?: string | null
          source_type: string
          status: string
          superseded_by_answer_id?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          answer_id?: string | null
          confirmed_by?: string | null
          created_at?: string
          declared_by?: string | null
          effective_at?: string
          evidence_id?: string | null
          id?: string
          intake_id?: string
          kind?: string
          master_id?: string | null
          organization_id?: string
          project_id?: string
          question_key?: string
          source_quote?: string | null
          source_type?: string
          status?: string
          superseded_by_answer_id?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      legal_form_submissions: {
        Row: {
          contact_id: string
          contribution: Json
          corrections: Json
          created_at: string
          definition_version: number
          form_id: string
          id: string
          organization_id: string
          other_role: string | null
          person: Json
          project_id: string
          roles: string[]
        }
        Insert: {
          contact_id: string
          contribution: Json
          corrections?: Json
          created_at?: string
          definition_version: number
          form_id: string
          id?: string
          organization_id: string
          other_role?: string | null
          person: Json
          project_id: string
          roles: string[]
        }
        Update: {
          contact_id?: string
          contribution?: Json
          corrections?: Json
          created_at?: string
          definition_version?: number
          form_id?: string
          id?: string
          organization_id?: string
          other_role?: string | null
          person?: Json
          project_id?: string
          roles?: string[]
        }
        Relationships: []
      }
      legal_formalities: {
        Row: {
          completed_at: string | null
          completion_proof: string | null
          created_at: string
          created_by: string | null
          definition_key: string
          definition_version: number
          external_id: string | null
          id: string
          master_id: string
          organization_id: string
          partial_reason: string | null
          project_id: string
          reopened: string[]
          responsible_person_id: string | null
          status: string
          submission_proof: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completion_proof?: string | null
          created_at?: string
          created_by?: string | null
          definition_key: string
          definition_version: number
          external_id?: string | null
          id?: string
          master_id: string
          organization_id: string
          partial_reason?: string | null
          project_id: string
          reopened?: string[]
          responsible_person_id?: string | null
          status?: string
          submission_proof?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completion_proof?: string | null
          created_at?: string
          created_by?: string | null
          definition_key?: string
          definition_version?: number
          external_id?: string | null
          id?: string
          master_id?: string
          organization_id?: string
          partial_reason?: string | null
          project_id?: string
          reopened?: string[]
          responsible_person_id?: string | null
          status?: string
          submission_proof?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_formality_documents: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          formality_id: string
          id: string
          organization_id: string
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          formality_id: string
          id?: string
          organization_id: string
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          formality_id?: string
          id?: string
          organization_id?: string
          version?: number
        }
        Relationships: []
      }
      legal_formality_events: {
        Row: {
          actor_person_id: string | null
          created_at: string
          formality_id: string
          id: string
          kind: string
          note: string | null
          organization_id: string
        }
        Insert: {
          actor_person_id?: string | null
          created_at?: string
          formality_id: string
          id?: string
          kind: string
          note?: string | null
          organization_id: string
        }
        Update: {
          actor_person_id?: string | null
          created_at?: string
          formality_id?: string
          id?: string
          kind?: string
          note?: string | null
          organization_id?: string
        }
        Relationships: []
      }
      legal_formality_signatures: {
        Row: {
          document_version: number
          formality_id: string
          id: string
          organization_id: string
          proof: string | null
          recorded_by: string | null
          role: string
          signed_at: string | null
          signer: string
          status: string
        }
        Insert: {
          document_version: number
          formality_id: string
          id?: string
          organization_id: string
          proof?: string | null
          recorded_by?: string | null
          role: string
          signed_at?: string | null
          signer: string
          status?: string
        }
        Update: {
          document_version?: number
          formality_id?: string
          id?: string
          organization_id?: string
          proof?: string | null
          recorded_by?: string | null
          role?: string
          signed_at?: string | null
          signer?: string
          status?: string
        }
        Relationships: []
      }
      legal_formality_values: {
        Row: {
          field_key: string
          formality_id: string
          organization_id: string
          source: string
          status: string
          validated_at: string | null
          validated_by: string | null
          value: Json
        }
        Insert: {
          field_key: string
          formality_id: string
          organization_id: string
          source: string
          status?: string
          validated_at?: string | null
          validated_by?: string | null
          value: Json
        }
        Update: {
          field_key?: string
          formality_id?: string
          organization_id?: string
          source?: string
          status?: string
          validated_at?: string | null
          validated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      legal_forms: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          definition_version: number
          expires_at: string
          id: string
          organization_id: string
          prefill: Json
          project_id: string
          revoked_at: string | null
          sent_at: string | null
          status: string
          submitted_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          definition_version: number
          expires_at: string
          id?: string
          organization_id: string
          prefill?: Json
          project_id: string
          revoked_at?: string | null
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          definition_version?: number
          expires_at?: string
          id?: string
          organization_id?: string
          prefill?: Json
          project_id?: string
          revoked_at?: string | null
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_intakes: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_plan_events: {
        Row: {
          created_at: string
          created_by: string | null
          from_value: string | null
          id: string
          item_id: string
          kind: string
          organization_id: string
          project_id: string
          to_value: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_value?: string | null
          id?: string
          item_id: string
          kind: string
          organization_id: string
          project_id: string
          to_value?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_value?: string | null
          id?: string
          item_id?: string
          kind?: string
          organization_id?: string
          project_id?: string
          to_value?: string | null
        }
        Relationships: []
      }
      legal_plan_items: {
        Row: {
          credit_ids: string[]
          created_at: string
          depends_on: string[]
          detail: string | null
          due_on: string | null
          id: string
          item_key: string
          kind: string
          label: string
          master_id: string | null
          organization_id: string
          plan_id: string
          project_id: string
          responsible_person_id: string | null
          status: string
          subject: string | null
          updated_at: string
          why: string | null
        }
        Insert: {
          credit_ids?: string[]
          created_at?: string
          depends_on?: string[]
          detail?: string | null
          due_on?: string | null
          id?: string
          item_key: string
          kind: string
          label: string
          master_id?: string | null
          organization_id: string
          plan_id: string
          project_id: string
          responsible_person_id?: string | null
          status: string
          subject?: string | null
          updated_at?: string
          why?: string | null
        }
        Update: {
          credit_ids?: string[]
          created_at?: string
          depends_on?: string[]
          detail?: string | null
          due_on?: string | null
          id?: string
          item_key?: string
          kind?: string
          label?: string
          master_id?: string | null
          organization_id?: string
          plan_id?: string
          project_id?: string
          responsible_person_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          why?: string | null
        }
        Relationships: []
      }
      legal_plans: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          dismissed_keys: string[]
          id: string
          launched_at: string | null
          launched_by: string | null
          organization_id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          dismissed_keys?: string[]
          id?: string
          launched_at?: string | null
          launched_by?: string | null
          organization_id: string
          project_id: string
          status: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          dismissed_keys?: string[]
          id?: string
          launched_at?: string | null
          launched_by?: string | null
          organization_id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_plans_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_plans_launched_by_fkey"
            columns: ["launched_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_plans_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      legal_project_contacts: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string
          role: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          role: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_project_contacts_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "legal_project_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_project_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_project_contacts_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      legal_split_confirmations: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string | null
          entry_id: string
          evidence: Json | null
          expires_at: string
          id: string
          organization_id: string
          responded_at: string | null
          revoked_at: string | null
          status: string
          token_hash: string
          version_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          entry_id: string
          evidence?: Json | null
          expires_at: string
          id?: string
          organization_id: string
          responded_at?: string | null
          revoked_at?: string | null
          status?: string
          token_hash: string
          version_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string | null
          entry_id?: string
          evidence?: Json | null
          expires_at?: string
          id?: string
          organization_id?: string
          responded_at?: string | null
          revoked_at?: string | null
          status?: string
          token_hash?: string
          version_id?: string
        }
        Relationships: []
      }
      legal_split_entries: {
        Row: {
          contact_id: string | null
          credit_id: string | null
          id: string
          name: string
          organization_id: string
          position: number
          role: string
          share: number
          version_id: string
        }
        Insert: {
          contact_id?: string | null
          credit_id?: string | null
          id?: string
          name: string
          organization_id: string
          position: number
          role: string
          share: number
          version_id: string
        }
        Update: {
          contact_id?: string | null
          credit_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          position?: number
          role?: string
          share?: number
          version_id?: string
        }
        Relationships: []
      }
      legal_split_events: {
        Row: {
          actor_person_id: string | null
          created_at: string
          entry_id: string | null
          id: string
          kind: string
          note: string | null
          organization_id: string
          version_id: string
        }
        Insert: {
          actor_person_id?: string | null
          created_at?: string
          entry_id?: string | null
          id?: string
          kind: string
          note?: string | null
          organization_id: string
          version_id: string
        }
        Update: {
          actor_person_id?: string | null
          created_at?: string
          entry_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          organization_id?: string
          version_id?: string
        }
        Relationships: []
      }
      legal_split_sheets: {
        Row: {
          created_at: string
          id: string
          master_id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          master_id: string
          organization_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          master_id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: []
      }
      legal_split_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          organization_id: string
          proposed_at: string | null
          proposed_by: string | null
          sheet_id: string
          status: string
          superseded_at: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id: string
          proposed_at?: string | null
          proposed_by?: string | null
          sheet_id: string
          status?: string
          superseded_at?: string | null
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          organization_id?: string
          proposed_at?: string | null
          proposed_by?: string | null
          sheet_id?: string
          status?: string
          superseded_at?: string | null
          version?: number
        }
        Relationships: []
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
      marketing_activations: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          created_by: string | null
          deliverable_id: string | null
          ends_on: string | null
          id: string
          kind: string
          lever_id: string | null
          note: string | null
          organization_id: string
          owner_person_id: string | null
          project_id: string
          starts_on: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          ends_on?: string | null
          id?: string
          kind?: string
          lever_id?: string | null
          note?: string | null
          organization_id: string
          owner_person_id?: string | null
          project_id: string
          starts_on?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          ends_on?: string | null
          id?: string
          kind?: string
          lever_id?: string | null
          note?: string | null
          organization_id?: string
          owner_person_id?: string | null
          project_id?: string
          starts_on?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_activations_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_activations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_activations_deliverable_same_org"
            columns: ["deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "strategy_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_activations_lever_same_org"
            columns: ["lever_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "levers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_activations_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_activations_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      marketing_closures: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          decision_comment: string | null
          id: string
          organization_id: string
          project_id: string
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          report_id: string
          request_note: string | null
          requested_at: string
          requested_by: string
          reserves: Json | null
          state: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          id?: string
          organization_id: string
          project_id: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          report_id: string
          request_note?: string | null
          requested_at?: string
          requested_by: string
          reserves?: Json | null
          state?: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          report_id?: string
          request_note?: string | null
          requested_at?: string
          requested_by?: string
          reserves?: Json | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_closures_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_closures_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_closures_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_closures_report_same_org"
            columns: ["report_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_reports"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_closures_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_events: {
        Row: {
          activation_id: string | null
          actor: string | null
          created_at: string
          id: string
          kind: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          project_id: string
          reason: string | null
          subject_id: string | null
        }
        Insert: {
          activation_id?: string | null
          actor?: string | null
          created_at?: string
          id?: string
          kind: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          project_id: string
          reason?: string | null
          subject_id?: string | null
        }
        Update: {
          activation_id?: string | null
          actor?: string | null
          created_at?: string
          id?: string
          kind?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          project_id?: string
          reason?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_events_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      marketing_evidence: {
        Row: {
          activation_id: string
          archived_at: string | null
          archived_by: string | null
          availability: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string
          link_reported_by: string | null
          link_unreachable_at: string | null
          metric: string | null
          observed_on: string | null
          organization_id: string
          period_end: string | null
          period_start: string | null
          platform: string | null
          project_id: string
          reported_by: string | null
          updated_at: string
          url: string | null
          value: number | null
          verification: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          activation_id: string
          archived_at?: string | null
          archived_by?: string | null
          availability?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          label: string
          link_reported_by?: string | null
          link_unreachable_at?: string | null
          metric?: string | null
          observed_on?: string | null
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          project_id: string
          reported_by?: string | null
          updated_at?: string
          url?: string | null
          value?: number | null
          verification?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          activation_id?: string
          archived_at?: string | null
          archived_by?: string | null
          availability?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string
          link_reported_by?: string | null
          link_unreachable_at?: string | null
          metric?: string | null
          observed_on?: string | null
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          project_id?: string
          reported_by?: string | null
          updated_at?: string
          url?: string | null
          value?: number | null
          verification?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_evidence_activation_same_org"
            columns: ["activation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_activations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_evidence_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_evidence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_evidence_link_reported_by_fkey"
            columns: ["link_reported_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_evidence_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_evidence_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_report_approvals: {
        Row: {
          comment: string | null
          decided_at: string
          decision: string
          id: string
          organization_id: string
          preparer_person_id: string | null
          project_id: string
          report_id: string
          report_version: number
          reserves: Json
          validator_person_id: string
        }
        Insert: {
          comment?: string | null
          decided_at?: string
          decision: string
          id?: string
          organization_id: string
          preparer_person_id?: string | null
          project_id: string
          report_id: string
          report_version: number
          reserves?: Json
          validator_person_id: string
        }
        Update: {
          comment?: string | null
          decided_at?: string
          decision?: string
          id?: string
          organization_id?: string
          preparer_person_id?: string | null
          project_id?: string
          report_id?: string
          report_version?: number
          reserves?: Json
          validator_person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_report_approvals_preparer_person_id_fkey"
            columns: ["preparer_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_report_approvals_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_report_approvals_report_same_org"
            columns: ["report_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_reports"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_report_approvals_validator_person_id_fkey"
            columns: ["validator_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_report_budgets: {
        Row: {
          committed_cents: number
          organization_id: string
          paid_cents: number
          planned_cents: number
          project_id: string
          report_id: string
        }
        Insert: {
          committed_cents: number
          organization_id: string
          paid_cents: number
          planned_cents: number
          project_id: string
          report_id: string
        }
        Update: {
          committed_cents?: number
          organization_id?: string
          paid_cents?: number
          planned_cents?: number
          project_id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_report_budgets_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_report_budgets_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "marketing_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_reports: {
        Row: {
          activation_ids: string[]
          content_hash: string
          created_at: string
          created_by: string | null
          format: string
          id: string
          organization_id: string
          period_end: string | null
          period_start: string | null
          project_id: string
          rules_version: number
          sections: string[]
          snapshot: Json
          state: string
          submitted_at: string | null
          submitted_by: string | null
          version: number
        }
        Insert: {
          activation_ids: string[]
          content_hash: string
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          project_id: string
          rules_version: number
          sections: string[]
          snapshot: Json
          state?: string
          submitted_at?: string | null
          submitted_by?: string | null
          version: number
        }
        Update: {
          activation_ids?: string[]
          content_hash?: string
          created_at?: string
          created_by?: string | null
          format?: string
          id?: string
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string
          rules_version?: number
          sections?: string[]
          snapshot?: Json
          state?: string
          submitted_at?: string | null
          submitted_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_reports_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_reserves: {
        Row: {
          activation_id: string | null
          arbitrated_at: string | null
          arbitrated_by: string | null
          category: string
          created_at: string
          created_by: string | null
          decision: string | null
          decision_reason: string | null
          description: string
          duplicate_of: string | null
          follow_up_channel: string | null
          follow_up_due_on: string | null
          follow_up_note: string | null
          follow_up_person_id: string | null
          id: string
          lift_note: string | null
          lifted_at: string | null
          lifted_by: string | null
          organization_id: string
          origin: string
          origin_report_id: string | null
          project_id: string
          status: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          activation_id?: string | null
          arbitrated_at?: string | null
          arbitrated_by?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          description: string
          duplicate_of?: string | null
          follow_up_channel?: string | null
          follow_up_due_on?: string | null
          follow_up_note?: string | null
          follow_up_person_id?: string | null
          id?: string
          lift_note?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          organization_id: string
          origin?: string
          origin_report_id?: string | null
          project_id: string
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          activation_id?: string | null
          arbitrated_at?: string | null
          arbitrated_by?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          description?: string
          duplicate_of?: string | null
          follow_up_channel?: string | null
          follow_up_due_on?: string | null
          follow_up_note?: string | null
          follow_up_person_id?: string | null
          id?: string
          lift_note?: string | null
          lifted_at?: string | null
          lifted_by?: string | null
          organization_id?: string
          origin?: string
          origin_report_id?: string | null
          project_id?: string
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_reserves_activation_same_org"
            columns: ["activation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_activations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_reserves_arbitrated_by_fkey"
            columns: ["arbitrated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_reserves_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_reserves_duplicate_same_org"
            columns: ["duplicate_of", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_reserves"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_reserves_follow_up_person_id_fkey"
            columns: ["follow_up_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_reserves_lifted_by_fkey"
            columns: ["lifted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_reserves_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_reserves_report_same_org"
            columns: ["origin_report_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_reports"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "marketing_reserves_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
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
      master_brief_calls: {
        Row: {
          call_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_brief_calls_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_brief_calls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_brief_calls_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      master_brief_questions: {
        Row: {
          answer_choices: string[] | null
          answer_text: string | null
          answered_at: string | null
          applied_at: string | null
          asked_to: string
          created_at: string
          created_by: string | null
          dimension: string
          id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          answer_choices?: string[] | null
          answer_text?: string | null
          answered_at?: string | null
          applied_at?: string | null
          asked_to: string
          created_at?: string
          created_by?: string | null
          dimension: string
          id?: string
          organization_id: string
          project_id: string
        }
        Update: {
          answer_choices?: string[] | null
          answer_text?: string | null
          answered_at?: string | null
          applied_at?: string | null
          asked_to?: string
          created_at?: string
          created_by?: string | null
          dimension?: string
          id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_brief_questions_asked_to_fkey"
            columns: ["asked_to"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_brief_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_brief_questions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      master_briefs: {
        Row: {
          constraints_text: string | null
          created_at: string
          created_by: string | null
          deliverables: string[]
          direction: string | null
          id: string
          master_final_due: string | null
          mastering_contact_id: string | null
          mastering_due: string | null
          mastering_rate_cents: number | null
          mastering_same_engineer: boolean
          mix_contact_id: string | null
          mix_final_due: string | null
          mix_rate_cents: number | null
          mix_v1_due: string | null
          organization_id: string
          project_id: string
          references_text: string | null
          revisions: number | null
          updated_at: string
          updated_by: string | null
          validator_person_id: string | null
        }
        Insert: {
          constraints_text?: string | null
          created_at?: string
          created_by?: string | null
          deliverables?: string[]
          direction?: string | null
          id?: string
          master_final_due?: string | null
          mastering_contact_id?: string | null
          mastering_due?: string | null
          mastering_rate_cents?: number | null
          mastering_same_engineer?: boolean
          mix_contact_id?: string | null
          mix_final_due?: string | null
          mix_rate_cents?: number | null
          mix_v1_due?: string | null
          organization_id: string
          project_id: string
          references_text?: string | null
          revisions?: number | null
          updated_at?: string
          updated_by?: string | null
          validator_person_id?: string | null
        }
        Update: {
          constraints_text?: string | null
          created_at?: string
          created_by?: string | null
          deliverables?: string[]
          direction?: string | null
          id?: string
          master_final_due?: string | null
          mastering_contact_id?: string | null
          mastering_due?: string | null
          mastering_rate_cents?: number | null
          mastering_same_engineer?: boolean
          mix_contact_id?: string | null
          mix_final_due?: string | null
          mix_rate_cents?: number | null
          mix_v1_due?: string | null
          organization_id?: string
          project_id?: string
          references_text?: string | null
          revisions?: number | null
          updated_at?: string
          updated_by?: string | null
          validator_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_briefs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_briefs_mastering_contact_same_org"
            columns: ["mastering_contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_briefs_mix_contact_same_org"
            columns: ["mix_contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_briefs_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_briefs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_briefs_validator_person_id_fkey"
            columns: ["validator_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      master_contributors: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          from_brief: boolean
          id: string
          master_id: string
          name: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          from_brief?: boolean
          id?: string
          master_id: string
          name: string
          organization_id: string
          role: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          from_brief?: boolean
          id?: string
          master_id?: string
          name?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_contributors_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
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
      master_deliverables_received: {
        Row: {
          created_at: string
          created_by: string | null
          deliverable: string
          id: string
          master_id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deliverable: string
          id?: string
          master_id: string
          organization_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deliverable?: string
          id?: string
          master_id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_deliverables_received_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_deliverables_received_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
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
          description: string | null
          duration_seconds: number | null
          file_name: string
          id: string
          master_id: string
          mime: string
          organization_id: string
          path: string
          replaces_id: string | null
          series_id: string
          version: number
        }
        Insert: {
          audio_state?: string | null
          bytes: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_name: string
          id?: string
          master_id: string
          mime: string
          organization_id: string
          path: string
          replaces_id?: string | null
          series_id?: string
          version?: number
        }
        Update: {
          audio_state?: string | null
          bytes?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          file_name?: string
          id?: string
          master_id?: string
          mime?: string
          organization_id?: string
          path?: string
          replaces_id?: string | null
          series_id?: string
          version?: number
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
      master_flow_sources: {
        Row: {
          created_at: string
          created_by: string | null
          file_id: string
          id: string
          master_id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_id: string
          id?: string
          master_id: string
          organization_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_id?: string
          id?: string
          master_id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_flow_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_flow_sources_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "master_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_flow_sources_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_flow_sources_title_in_project"
            columns: ["project_id", "master_id"]
            isOneToOne: false
            referencedRelation: "project_masters"
            referencedColumns: ["project_id", "master_id"]
          },
        ]
      }
      master_mix_comments: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string
          version_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          version_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_mix_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_mix_comments_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_mix_comments_version_same_org"
            columns: ["version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "master_mix_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      master_mix_versions: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_note: string | null
          feedback_sent_at: string | null
          feedback_sent_by: string | null
          feedback_summary: string | null
          file_id: string
          id: string
          master_id: string
          number: number
          organization_id: string
          project_id: string
          stage: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_note?: string | null
          feedback_sent_at?: string | null
          feedback_sent_by?: string | null
          feedback_summary?: string | null
          file_id: string
          id?: string
          master_id: string
          number: number
          organization_id: string
          project_id: string
          stage?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_note?: string | null
          feedback_sent_at?: string | null
          feedback_sent_by?: string | null
          feedback_summary?: string | null
          file_id?: string
          id?: string
          master_id?: string
          number?: number
          organization_id?: string
          project_id?: string
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_mix_versions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_mix_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "master_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_mix_versions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_mix_versions_title_in_project"
            columns: ["project_id", "master_id"]
            isOneToOne: false
            referencedRelation: "project_masters"
            referencedColumns: ["project_id", "master_id"]
          },
          {
            foreignKeyName: "master_mix_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_mix_versions_feedback_sent_by_fkey"
            columns: ["feedback_sent_by"]
            isOneToOne: false
            referencedRelation: "people"
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
          artist_id: string | null
          contact_id: string | null
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
          artist_id?: string | null
          contact_id?: string | null
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
          artist_id?: string | null
          contact_id?: string | null
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
      master_transmissions: {
        Row: {
          acknowledged_at: string | null
          contact_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          note: string | null
          organization_id: string
          package: Json
          project_id: string
          revoked_at: string | null
          role: string
          token_hash: string
        }
        Insert: {
          acknowledged_at?: string | null
          contact_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          note?: string | null
          organization_id: string
          package: Json
          project_id: string
          revoked_at?: string | null
          role: string
          token_hash: string
        }
        Update: {
          acknowledged_at?: string | null
          contact_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          note?: string | null
          organization_id?: string
          package?: Json
          project_id?: string
          revoked_at?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_transmissions_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "master_transmissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_transmissions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      member_welcomes: {
        Row: {
          dismissed_at: string
          organization_id: string
          person_id: string
        }
        Insert: {
          dismissed_at?: string
          organization_id: string
          person_id: string
        }
        Update: {
          dismissed_at?: string
          organization_id?: string
          person_id?: string
        }
        Relationships: []
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
          channel: string
          created_at: string
          created_by: string | null
          deliverable_id: string | null
          id: string
          kind: string
          notes: string | null
          occurs_on: string
          organization_id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
          occurs_on: string
          organization_id: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
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
          source_label: string | null
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
          source_label?: string | null
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
          source_label?: string | null
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
      network_contacts: {
        Row: {
          archived_at: string | null
          artist_id: string | null
          city: string | null
          created_at: string
          created_by: string | null
          deezer_artist_id: number | null
          email: string | null
          id: string
          instagram_handle: string | null
          kind: string
          name: string
          notes: string | null
          organization_id: string
          parent_id: string | null
          phone: string | null
          roles: string[]
          spotify_artist_id: string | null
          tiktok_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          archived_at?: string | null
          artist_id?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          deezer_artist_id?: number | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          kind: string
          name: string
          notes?: string | null
          organization_id: string
          parent_id?: string | null
          phone?: string | null
          roles: string[]
          spotify_artist_id?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          archived_at?: string | null
          artist_id?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          deezer_artist_id?: number | null
          email?: string | null
          id?: string
          instagram_handle?: string | null
          kind?: string
          name?: string
          notes?: string | null
          organization_id?: string
          parent_id?: string | null
          phone?: string | null
          roles?: string[]
          spotify_artist_id?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_contacts_artist_same_org"
            columns: ["artist_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "network_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_contacts_parent_same_org"
            columns: ["parent_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
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
      production_activation_handoffs: {
        Row: {
          confirmed_at: string
          confirmed_by: string | null
          constraints_note: string | null
          deliverable_id: string
          delivered_at: string
          final_url: string | null
          formats: string[]
          id: string
          organization_id: string
          project_id: string
          sheet_id: string
          version_id: string | null
        }
        Insert: {
          confirmed_at?: string
          confirmed_by?: string | null
          constraints_note?: string | null
          deliverable_id: string
          delivered_at: string
          final_url?: string | null
          formats?: string[]
          id?: string
          organization_id: string
          project_id: string
          sheet_id: string
          version_id?: string | null
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string | null
          constraints_note?: string | null
          deliverable_id?: string
          delivered_at?: string
          final_url?: string | null
          formats?: string[]
          id?: string
          organization_id?: string
          project_id?: string
          sheet_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_activation_handoffs_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_activation_handoffs_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_activation_handoffs_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_activation_handoffs_version_same_org"
            columns: ["version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_assignments: {
        Row: {
          availability: string
          availability_set_at: string | null
          availability_set_by: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          need_id: string
          note: string | null
          organization_id: string
          person_id: string | null
          project_id: string
        }
        Insert: {
          availability?: string
          availability_set_at?: string | null
          availability_set_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          need_id: string
          note?: string | null
          organization_id: string
          person_id?: string | null
          project_id: string
        }
        Update: {
          availability?: string
          availability_set_at?: string | null
          availability_set_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          need_id?: string
          note?: string | null
          organization_id?: string
          person_id?: string | null
          project_id?: string
        }
        Relationships: []
      }
      production_budget_lines: {
        Row: {
          amount_cents: number | null
          category: string
          created_at: string
          created_by: string | null
          equipment_id: string | null
          id: string
          label: string
          note: string | null
          organization_id: string
          position: number
          project_id: string
          sheet_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          category: string
          created_at?: string
          created_by?: string | null
          equipment_id?: string | null
          id?: string
          label: string
          note?: string | null
          organization_id: string
          position?: number
          project_id: string
          sheet_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          equipment_id?: string | null
          id?: string
          label?: string
          note?: string | null
          organization_id?: string
          position?: number
          project_id?: string
          sheet_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_budget_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_budget_lines_equipment_same_org"
            columns: ["equipment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_equipment"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_budget_lines_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_budget_lines_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_call_items: {
        Row: {
          body: string
          call_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          organization_id: string
          position: number
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sheet_id: string
          source: string
          source_quote: string | null
          source_report_item_id: string | null
          status: string
          topic: string
        }
        Insert: {
          body: string
          call_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          organization_id: string
          position?: number
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sheet_id: string
          source?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          status?: string
          topic: string
        }
        Update: {
          body?: string
          call_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          organization_id?: string
          position?: number
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sheet_id?: string
          source?: string
          source_quote?: string | null
          source_report_item_id?: string | null
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_call_items_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_call_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_call_items_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_call_items_report_item_same_org"
            columns: ["source_report_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "report_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_call_items_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_call_items_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_call_sheets: {
        Row: {
          call_time: string | null
          contacts_note: string | null
          documents_note: string | null
          emergencies: string | null
          instructions: string | null
          organization_id: string
          project_id: string
          schedule: string | null
          sequences: string | null
          sheet_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          call_time?: string | null
          contacts_note?: string | null
          documents_note?: string | null
          emergencies?: string | null
          instructions?: string | null
          organization_id: string
          project_id: string
          schedule?: string | null
          sequences?: string | null
          sheet_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          call_time?: string | null
          contacts_note?: string | null
          documents_note?: string | null
          emergencies?: string | null
          instructions?: string | null
          organization_id?: string
          project_id?: string
          schedule?: string | null
          sequences?: string | null
          sheet_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_call_sheets_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_call_sheets_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_call_sheets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      production_calls: {
        Row: {
          call_id: string
          created_at: string
          format: string
          organization_id: string
          participants: Json
          project_id: string
          purpose: string
          sheet_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          format: string
          organization_id: string
          participants?: Json
          project_id: string
          purpose: string
          sheet_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          format?: string
          organization_id?: string
          participants?: Json
          project_id?: string
          purpose?: string
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_calls_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_equipment: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          deposit_cents: number | null
          id: string
          incident_note: string | null
          label: string
          note: string | null
          organization_id: string
          period_end: string | null
          period_start: string | null
          position: number
          price_cents: number | null
          project_id: string
          quantity: number | null
          quote_file_id: string | null
          return_contact_id: string | null
          return_due: string | null
          return_person_id: string | null
          return_terms: string | null
          returned_at: string | null
          returned_by: string | null
          sheet_id: string
          status: string
          supplier_contact_id: string | null
          supplier_name: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          deposit_cents?: number | null
          id?: string
          incident_note?: string | null
          label: string
          note?: string | null
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          position?: number
          price_cents?: number | null
          project_id: string
          quantity?: number | null
          quote_file_id?: string | null
          return_contact_id?: string | null
          return_due?: string | null
          return_person_id?: string | null
          return_terms?: string | null
          returned_at?: string | null
          returned_by?: string | null
          sheet_id: string
          status?: string
          supplier_contact_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          deposit_cents?: number | null
          id?: string
          incident_note?: string | null
          label?: string
          note?: string | null
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          position?: number
          price_cents?: number | null
          project_id?: string
          quantity?: number | null
          quote_file_id?: string | null
          return_contact_id?: string | null
          return_due?: string | null
          return_person_id?: string | null
          return_terms?: string | null
          returned_at?: string | null
          returned_by?: string | null
          sheet_id?: string
          status?: string
          supplier_contact_id?: string | null
          supplier_name?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_equipment_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_equipment_quote_same_org"
            columns: ["quote_file_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_files"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_equipment_return_contact_same_org"
            columns: ["return_contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_equipment_return_person_id_fkey"
            columns: ["return_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_equipment_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_equipment_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_equipment_supplier_same_org"
            columns: ["supplier_contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_equipment_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      production_export_checks: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          label: string
          note: string | null
          organization_id: string
          position: number
          project_id: string
          result: string | null
          sheet_id: string
          url: string | null
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label: string
          note?: string | null
          organization_id: string
          position?: number
          project_id: string
          result?: string | null
          sheet_id: string
          url?: string | null
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          label?: string
          note?: string | null
          organization_id?: string
          position?: number
          project_id?: string
          result?: string | null
          sheet_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_export_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_export_checks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_export_checks_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_export_checks_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_files: {
        Row: {
          bytes: number
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          kind: string
          mime: string
          note: string | null
          organization_id: string
          path: string
          project_id: string
          sheet_id: string
        }
        Insert: {
          bytes: number
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          kind: string
          mime: string
          note?: string | null
          organization_id: string
          path: string
          project_id: string
          sheet_id: string
        }
        Update: {
          bytes?: number
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          kind?: string
          mime?: string
          note?: string | null
          organization_id?: string
          path?: string
          project_id?: string
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_files_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_files_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_incidents: {
        Row: {
          blocks_closing: boolean
          blocks_post: boolean
          contact_id: string | null
          created_at: string
          created_by: string | null
          follow_up: string | null
          id: string
          impact: string | null
          organization_id: string
          person_id: string | null
          project_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          sheet_id: string
          title: string
        }
        Insert: {
          blocks_closing?: boolean
          blocks_post?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up?: string | null
          id?: string
          impact?: string | null
          organization_id: string
          person_id?: string | null
          project_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sheet_id: string
          title: string
        }
        Update: {
          blocks_closing?: boolean
          blocks_post?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          follow_up?: string | null
          id?: string
          impact?: string | null
          organization_id?: string
          person_id?: string | null
          project_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sheet_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_incidents_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_incidents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_incidents_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_incidents_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_needs: {
        Row: {
          created_at: string
          created_by: string | null
          family: string
          headcount: number
          id: string
          label: string | null
          note: string | null
          organization_id: string
          position: number
          project_id: string
          role_key: string
          sheet_id: string
          speciality: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          family: string
          headcount?: number
          id?: string
          label?: string | null
          note?: string | null
          organization_id: string
          position?: number
          project_id: string
          role_key: string
          sheet_id: string
          speciality?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          family?: string
          headcount?: number
          id?: string
          label?: string | null
          note?: string | null
          organization_id?: string
          position?: number
          project_id?: string
          role_key?: string
          sheet_id?: string
          speciality?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      production_plan_actions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blocking: boolean
          contact_id: string | null
          created_at: string
          created_by: string | null
          depends_on: string[]
          due_date: string | null
          id: string
          item_id: string | null
          note: string | null
          organization_id: string
          person_id: string | null
          position: number
          project_id: string
          sheet_id: string
          status: string
          task_id: string | null
          title: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blocking?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          depends_on?: string[]
          due_date?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          organization_id: string
          person_id?: string | null
          position?: number
          project_id: string
          sheet_id: string
          status?: string
          task_id?: string | null
          title: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blocking?: boolean
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          depends_on?: string[]
          due_date?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          organization_id?: string
          person_id?: string | null
          position?: number
          project_id?: string
          sheet_id?: string
          status?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_plan_actions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plan_actions_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_plan_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plan_actions_item_same_org"
            columns: ["item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_call_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_plan_actions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_plan_actions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_plan_actions_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_plan_actions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      production_post_references: {
        Row: {
          created_at: string
          created_by: string | null
          file_id: string | null
          id: string
          kind: string
          note: string | null
          organization_id: string
          project_id: string
          sheet_id: string
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          kind: string
          note?: string | null
          organization_id: string
          project_id: string
          sheet_id: string
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          organization_id?: string
          project_id?: string
          sheet_id?: string
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_post_references_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_post_references_file_same_org"
            columns: ["file_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_files"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_post_references_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_post_references_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_post_steps: {
        Row: {
          access_note: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          ends_on: string | null
          id: string
          label: string | null
          organization_id: string
          person_id: string | null
          position: number
          project_id: string
          responsibilities: string | null
          sheet_id: string
          starts_on: string | null
          status: string
          step_key: string
          updated_at: string
        }
        Insert: {
          access_note?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          label?: string | null
          organization_id: string
          person_id?: string | null
          position?: number
          project_id: string
          responsibilities?: string | null
          sheet_id: string
          starts_on?: string | null
          status?: string
          step_key: string
          updated_at?: string
        }
        Update: {
          access_note?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          label?: string | null
          organization_id?: string
          person_id?: string | null
          position?: number
          project_id?: string
          responsibilities?: string | null
          sheet_id?: string
          starts_on?: string | null
          status?: string
          step_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_post_steps_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_post_steps_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_post_steps_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_post_steps_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_post_steps_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_readiness_checks: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          id: string
          key: string
          note: string | null
          organization_id: string
          project_id: string
          required: boolean
          sheet_id: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          key: string
          note?: string | null
          organization_id: string
          project_id: string
          required: boolean
          sheet_id: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          id?: string
          key?: string
          note?: string | null
          organization_id?: string
          project_id?: string
          required?: boolean
          sheet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_readiness_checks_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_readiness_checks_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_readiness_checks_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_sheets: {
        Row: {
          brief_updated_at: string | null
          brief_updated_by: string | null
          budget_envelope_cents: number | null
          camera_note: string | null
          camera_setup: string | null
          constraints_note: string | null
          coverage: string | null
          coverage_note: string | null
          deliverable_id: string
          delivery_date: string | null
          director_contact_id: string | null
          director_person_id: string | null
          handoff_id: string | null
          id: string
          location_access: string | null
          location_address: string | null
          location_name: string | null
          location_notes: string | null
          location_status: string
          mode: string
          open_needs: string | null
          opened_at: string
          opened_by: string | null
          organization_id: string
          post_end: string | null
          post_start: string | null
          project_id: string
          ready_at: string | null
          ready_by: string | null
          references_note: string | null
          run_of_show: string | null
          shoot_date: string | null
          sound_capture: string | null
          sound_note: string | null
          source_version_id: string | null
          staging_intent: string | null
        }
        Insert: {
          brief_updated_at?: string | null
          brief_updated_by?: string | null
          budget_envelope_cents?: number | null
          camera_note?: string | null
          camera_setup?: string | null
          constraints_note?: string | null
          coverage?: string | null
          coverage_note?: string | null
          deliverable_id: string
          delivery_date?: string | null
          director_contact_id?: string | null
          director_person_id?: string | null
          handoff_id?: string | null
          id?: string
          location_access?: string | null
          location_address?: string | null
          location_name?: string | null
          location_notes?: string | null
          location_status?: string
          mode: string
          open_needs?: string | null
          opened_at?: string
          opened_by?: string | null
          organization_id: string
          post_end?: string | null
          post_start?: string | null
          project_id: string
          ready_at?: string | null
          ready_by?: string | null
          references_note?: string | null
          run_of_show?: string | null
          shoot_date?: string | null
          sound_capture?: string | null
          sound_note?: string | null
          source_version_id?: string | null
          staging_intent?: string | null
        }
        Update: {
          brief_updated_at?: string | null
          brief_updated_by?: string | null
          budget_envelope_cents?: number | null
          camera_note?: string | null
          camera_setup?: string | null
          constraints_note?: string | null
          coverage?: string | null
          coverage_note?: string | null
          deliverable_id?: string
          delivery_date?: string | null
          director_contact_id?: string | null
          director_person_id?: string | null
          handoff_id?: string | null
          id?: string
          location_access?: string | null
          location_address?: string | null
          location_name?: string | null
          location_notes?: string | null
          location_status?: string
          mode?: string
          open_needs?: string | null
          opened_at?: string
          opened_by?: string | null
          organization_id?: string
          post_end?: string | null
          post_start?: string | null
          project_id?: string
          ready_at?: string | null
          ready_by?: string | null
          references_note?: string | null
          run_of_show?: string | null
          shoot_date?: string | null
          sound_capture?: string | null
          sound_note?: string | null
          source_version_id?: string | null
          staging_intent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_sheets_brief_updated_by_fkey"
            columns: ["brief_updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sheets_contact_same_org"
            columns: ["director_contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_sheets_deliverable_same_org"
            columns: ["deliverable_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "strategy_deliverables"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_sheets_director_person_id_fkey"
            columns: ["director_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sheets_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "design_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sheets_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sheets_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_sheets_ready_by_fkey"
            columns: ["ready_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_sheets_version_fk"
            columns: ["source_version_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      production_shoots: {
        Row: {
          audio_sources: boolean
          audio_sources_at: string | null
          audio_sources_by: string | null
          backup_verified: boolean
          backup_verified_at: string | null
          backup_verified_by: string | null
          deviations: string | null
          files_location: string | null
          missing_sequences: string | null
          observations: string | null
          organization_id: string
          project_id: string
          report_note: string | null
          report_validated_at: string | null
          report_validated_by: string | null
          sheet_id: string
          state: string
          updated_at: string
          video_rushes: boolean
          video_rushes_at: string | null
          video_rushes_by: string | null
        }
        Insert: {
          audio_sources?: boolean
          audio_sources_at?: string | null
          audio_sources_by?: string | null
          backup_verified?: boolean
          backup_verified_at?: string | null
          backup_verified_by?: string | null
          deviations?: string | null
          files_location?: string | null
          missing_sequences?: string | null
          observations?: string | null
          organization_id: string
          project_id: string
          report_note?: string | null
          report_validated_at?: string | null
          report_validated_by?: string | null
          sheet_id: string
          state?: string
          updated_at?: string
          video_rushes?: boolean
          video_rushes_at?: string | null
          video_rushes_by?: string | null
        }
        Update: {
          audio_sources?: boolean
          audio_sources_at?: string | null
          audio_sources_by?: string | null
          backup_verified?: boolean
          backup_verified_at?: string | null
          backup_verified_by?: string | null
          deviations?: string | null
          files_location?: string | null
          missing_sequences?: string | null
          observations?: string | null
          organization_id?: string
          project_id?: string
          report_note?: string | null
          report_validated_at?: string | null
          report_validated_by?: string | null
          sheet_id?: string
          state?: string
          updated_at?: string
          video_rushes?: boolean
          video_rushes_at?: string | null
          video_rushes_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_shoots_audio_sources_by_fkey"
            columns: ["audio_sources_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shoots_backup_verified_by_fkey"
            columns: ["backup_verified_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shoots_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_shoots_report_validated_by_fkey"
            columns: ["report_validated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_shoots_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_shoots_video_rushes_by_fkey"
            columns: ["video_rushes_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      production_team_briefs: {
        Row: {
          fields: Json
          id: string
          organization_id: string
          project_id: string
          sheet_id: string
          snapshot: Json | null
          source_version_id: string | null
          team: string
          transmitted_at: string | null
          transmitted_by: string | null
          updated_at: string
        }
        Insert: {
          fields?: Json
          id?: string
          organization_id: string
          project_id: string
          sheet_id: string
          snapshot?: Json | null
          source_version_id?: string | null
          team: string
          transmitted_at?: string | null
          transmitted_by?: string | null
          updated_at?: string
        }
        Update: {
          fields?: Json
          id?: string
          organization_id?: string
          project_id?: string
          sheet_id?: string
          snapshot?: Json | null
          source_version_id?: string | null
          team?: string
          transmitted_at?: string | null
          transmitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_team_briefs_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_team_briefs_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_team_briefs_transmitted_by_fkey"
            columns: ["transmitted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      production_version_comments: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          file_id: string | null
          id: string
          organization_id: string
          project_id: string
          sheet_id: string
          status: string
          status_at: string | null
          status_by: string | null
          timecode_ms: number | null
          version_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          organization_id: string
          project_id: string
          sheet_id: string
          status?: string
          status_at?: string | null
          status_by?: string | null
          timecode_ms?: number | null
          version_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          file_id?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          sheet_id?: string
          status?: string
          status_at?: string | null
          status_by?: string | null
          timecode_ms?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_version_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_version_comments_file_same_org"
            columns: ["file_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_files"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_version_comments_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_version_comments_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_version_comments_status_by_fkey"
            columns: ["status_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_version_comments_version_same_org"
            columns: ["version_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_versions"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_versions: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          file_id: string | null
          id: string
          label: string | null
          notes: string | null
          number: number
          organization_id: string
          person_id: string | null
          project_id: string
          sheet_id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          url: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          file_id?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          number?: number
          organization_id: string
          person_id?: string | null
          project_id: string
          sheet_id: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          url?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          file_id?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          number?: number
          organization_id?: string
          person_id?: string | null
          project_id?: string
          sheet_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_versions_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_versions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_versions_file_same_org"
            columns: ["file_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_files"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_versions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_versions_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_versions_sheet_same_org"
            columns: ["sheet_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "production_sheets"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "production_versions_submitted_by_fkey"
            columns: ["submitted_by"]
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
      project_files: {
        Row: {
          bytes: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string
          id: string
          mime: string
          organization_id: string
          path: string
          project_id: string
          replaces_id: string | null
          series_id: string
          version: number
        }
        Insert: {
          bytes: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          id?: string
          mime: string
          organization_id: string
          path: string
          project_id: string
          replaces_id?: string | null
          series_id?: string
          version?: number
        }
        Update: {
          bytes?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          id?: string
          mime?: string
          organization_id?: string
          path?: string
          project_id?: string
          replaces_id?: string | null
          series_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
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
      project_plan_items: {
        Row: {
          column_key: string
          id: string
          launched_at: string | null
          launched_by: string | null
          organization_id: string
          owner_person_id: string | null
          plan_id: string
          position: number
          project_id: string
          title: string
          why: string | null
          workflow: string | null
        }
        Insert: {
          column_key: string
          id?: string
          launched_at?: string | null
          launched_by?: string | null
          organization_id: string
          owner_person_id?: string | null
          plan_id: string
          position?: number
          project_id: string
          title: string
          why?: string | null
          workflow?: string | null
        }
        Update: {
          column_key?: string
          id?: string
          launched_at?: string | null
          launched_by?: string | null
          organization_id?: string
          owner_person_id?: string | null
          plan_id?: string
          position?: number
          project_id?: string
          title?: string
          why?: string | null
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_plan_items_launched_by_fkey"
            columns: ["launched_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plan_items_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plan_items_plan_same_org"
            columns: ["plan_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "project_plans"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_plan_items_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_plans: {
        Row: {
          brief_id: string | null
          id: string
          launched_at: string
          launched_by: string | null
          organization_id: string
          project_id: string
        }
        Insert: {
          brief_id?: string | null
          id?: string
          launched_at?: string
          launched_by?: string | null
          organization_id: string
          project_id: string
        }
        Update: {
          brief_id?: string | null
          id?: string
          launched_at?: string
          launched_by?: string | null
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_plans_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "framing_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plans_launched_by_fkey"
            columns: ["launched_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_plans_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_reviews: {
        Row: {
          id: string
          improve: string | null
          organization_id: string
          project_id: string
          results: string | null
          updated_at: string
          updated_by: string | null
          worked: string | null
        }
        Insert: {
          id?: string
          improve?: string | null
          organization_id: string
          project_id: string
          results?: string | null
          updated_at?: string
          updated_by?: string | null
          worked?: string | null
        }
        Update: {
          id?: string
          improve?: string | null
          organization_id?: string
          project_id?: string
          results?: string | null
          updated_at?: string
          updated_by?: string | null
          worked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_reviews_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_reviews_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
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
          contact_id: string | null
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
          source_label: string | null
          source_quote: string | null
          source_report_item_id: string | null
          source_start_seconds: number | null
          source_type: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
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
          source_label?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
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
          source_label?: string | null
          source_quote?: string | null
          source_report_item_id?: string | null
          source_start_seconds?: number | null
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_contact_same_org"
            columns: ["contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
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
          content_format_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          initial_context: string | null
          music_format: string | null
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
          content_format_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          initial_context?: string | null
          music_format?: string | null
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
          content_format_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          initial_context?: string | null
          music_format?: string | null
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
            foreignKeyName: "projects_content_format_same_org"
            columns: ["content_format_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "content_formats"
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
          delivered_on: string | null
          delivered_to_contact_id: string | null
          delivery_note: string | null
          delivery_recorded_at: string | null
          delivery_recorded_by: string | null
          id: string
          isrc: string | null
          last_checked_at: string | null
          online_confirmed_by: string | null
          online_confirmed_on: string | null
          online_confirmed_url: string | null
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
          delivered_on?: string | null
          delivered_to_contact_id?: string | null
          delivery_note?: string | null
          delivery_recorded_at?: string | null
          delivery_recorded_by?: string | null
          id?: string
          isrc?: string | null
          last_checked_at?: string | null
          online_confirmed_by?: string | null
          online_confirmed_on?: string | null
          online_confirmed_url?: string | null
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
          delivered_on?: string | null
          delivered_to_contact_id?: string | null
          delivery_note?: string | null
          delivery_recorded_at?: string | null
          delivery_recorded_by?: string | null
          id?: string
          isrc?: string | null
          last_checked_at?: string | null
          online_confirmed_by?: string | null
          online_confirmed_on?: string | null
          online_confirmed_url?: string | null
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
            foreignKeyName: "releases_delivered_to_same_org"
            columns: ["delivered_to_contact_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "network_contacts"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "releases_delivery_recorded_by_fkey"
            columns: ["delivery_recorded_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_online_confirmed_by_fkey"
            columns: ["online_confirmed_by"]
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
          brief_key: string | null
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
          brief_key?: string | null
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
          brief_key?: string | null
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
          document_id: string | null
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
          document_id?: string | null
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
          document_id?: string | null
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
      strategy_calls: {
        Row: {
          call_id: string
          created_at: string
          document_ids: string[]
          format: string
          organization_id: string
          participants: Json
          project_id: string
          purpose: string
        }
        Insert: {
          call_id: string
          created_at?: string
          document_ids?: string[]
          format: string
          organization_id: string
          participants?: Json
          project_id: string
          purpose: string
        }
        Update: {
          call_id?: string
          created_at?: string
          document_ids?: string[]
          format?: string
          organization_id?: string
          participants?: Json
          project_id?: string
          purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_calls_call_same_org"
            columns: ["call_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "strategy_calls_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
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
          quantity: number | null
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
          quantity?: number | null
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
          quantity?: number | null
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
      strategy_document_drafts: {
        Row: {
          config: Json
          kind: string
          organization_id: string
          project_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          kind: string
          organization_id: string
          project_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          kind?: string
          organization_id?: string
          project_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_document_drafts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_drafts_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      strategy_document_reviews: {
        Row: {
          comment: string | null
          created_at: string
          decided_at: string | null
          document_id: string
          id: string
          organization_id: string
          person_id: string
          reminded_at: string | null
          state: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          document_id: string
          id?: string
          organization_id: string
          person_id: string
          reminded_at?: string | null
          state?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          document_id?: string
          id?: string
          organization_id?: string
          person_id?: string
          reminded_at?: string | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_document_reviews_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_reviews_document_same_org"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "strategy_documents"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      strategy_documents: {
        Row: {
          change_comment: string | null
          content: Json
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          id: string
          kind: string
          organization_id: string
          project_id: string
          request_note: string | null
          sent_at: string | null
          state: string
          validation_id: string | null
          version: number
        }
        Insert: {
          change_comment?: string | null
          content: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          kind: string
          organization_id: string
          project_id: string
          request_note?: string | null
          sent_at?: string | null
          state?: string
          validation_id?: string | null
          version: number
        }
        Update: {
          change_comment?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          kind?: string
          organization_id?: string
          project_id?: string
          request_note?: string | null
          sent_at?: string | null
          state?: string
          validation_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_documents_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_documents_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "strategy_documents_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "validations"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_kpi_measures: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          measured_on: string
          objective_id: string
          organization_id: string
          project_id: string
          source_note: string | null
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          measured_on: string
          objective_id: string
          organization_id: string
          project_id: string
          source_note?: string | null
          value: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          measured_on?: string
          objective_id?: string
          organization_id?: string
          project_id?: string
          source_note?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_kpi_measures_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "strategy_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_kpi_measures_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      strategy_objectives: {
        Row: {
          created_at: string
          created_by: string | null
          due_on: string | null
          id: string
          kind: string
          label: string
          organization_id: string
          project_id: string
          source: string
          target: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          id?: string
          kind?: string
          label: string
          organization_id: string
          project_id: string
          source?: string
          target?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_on?: string | null
          id?: string
          kind?: string
          label?: string
          organization_id?: string
          project_id?: string
          source?: string
          target?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_objectives_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      strategy_recommendations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          project_id: string
          rule_key: string
          state: string
          task_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          project_id: string
          rule_key: string
          state: string
          task_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          rule_key?: string
          state?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_recommendations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_recommendations_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "strategy_recommendations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_workspaces: {
        Row: {
          organization_id: string
          project_id: string
          revision_opened_at: string | null
          revision_opened_by: string | null
          started_at: string
          started_by: string | null
        }
        Insert: {
          organization_id: string
          project_id: string
          revision_opened_at?: string | null
          revision_opened_by?: string | null
          started_at?: string
          started_by?: string | null
        }
        Update: {
          organization_id?: string
          project_id?: string
          revision_opened_at?: string | null
          revision_opened_by?: string | null
          started_at?: string
          started_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_workspaces_project_same_org"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "strategy_workspaces_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_person_id: string
          created_at: string
          created_by: string | null
          deliverable_id: string | null
          done_at: string | null
          due_date: string | null
          id: string
          legal_plan_item_id: string | null
          master_question_id: string | null
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
          deliverable_id?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          legal_plan_item_id?: string | null
          master_question_id?: string | null
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
          deliverable_id?: string | null
          done_at?: string | null
          due_date?: string | null
          id?: string
          legal_plan_item_id?: string | null
          master_question_id?: string | null
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
            foreignKeyName: "tasks_master_question_same_org"
            columns: ["master_question_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "master_brief_questions"
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
          source_label: string | null
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
      library_files: {
        Row: {
          bytes: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          file_name: string | null
          id: string | null
          mime: string | null
          organization_id: string | null
          owner_id: string | null
          owner_label: string | null
          path: string | null
          rank: number | null
          series_id: string | null
          source: string | null
          version: number | null
          version_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      arbitrate_marketing_reserve: {
        Args: {
          p_decision: string
          p_duplicate_of: string
          p_follow_up_channel: string
          p_follow_up_due_on: string
          p_follow_up_person_id: string
          p_reason: string
          p_reserve_id: string
        }
        Returns: undefined
      }
      create_reserve_task: { Args: { p_reserve_id: string }; Returns: string }
      decide_marketing_closure: {
        Args: { p_closure_id: string; p_comment: string; p_decision: string }
        Returns: undefined
      }
      lift_marketing_reserve: {
        Args: { p_note: string; p_reserve_id: string }
        Returns: undefined
      }
      link_reserve_task: {
        Args: { p_reserve_id: string; p_task_id: string }
        Returns: undefined
      }
      marketing_is_closed: { Args: { p_project_id: string }; Returns: boolean }
      note_marketing_reserve: {
        Args: { p_note: string; p_reserve_id: string }
        Returns: undefined
      }
      reopen_distribution_closure: {
        Args: { p_note: string; p_project_id: string }
        Returns: undefined
      }
      propose_distribution_closure: {
        Args: {
          p_arbitration: string
          p_kind: string
          p_project_id: string
          p_reserves: Json
        }
        Returns: undefined
      }
      distribution_closure_ready: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      decide_distribution_closure: {
        Args: { p_approve: boolean; p_closure_id: string; p_note: string }
        Returns: undefined
      }
      reopen_marketing_closure: {
        Args: { p_closure_id: string; p_reason: string }
        Returns: undefined
      }
      request_marketing_closure: {
        Args: { p_note: string; p_project_id: string; p_report_id: string }
        Returns: string
      }
      set_distribution_anomaly_state: {
        Args: { p_anomaly_id: string; p_note: string; p_state: string }
        Returns: undefined
      }
      report_distribution_anomaly: {
        Args: {
          p_description: string
          p_kind: string
          p_platform: string
          p_project_id: string
          p_severity: string
          p_source_module: string
        }
        Returns: string
      }
      prepare_distribution_version: {
        Args: { p_note: string; p_project_id: string }
        Returns: undefined
      }
      decide_marketing_report: {
        Args: {
          p_comment: string
          p_decision: string
          p_expected_version: number
          p_report_id: string
        }
        Returns: string
      }
      submit_marketing_report: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      verify_distribution_platform: {
        Args: {
          p_compliance: string
          p_compliance_note: string
          p_platform: string
          p_project_id: string
          p_verification: string
          p_verification_note: string
        }
        Returns: undefined
      }
      save_distribution_platform: {
        Args: {
          p_available: boolean
          p_label: string
          p_platform: string
          p_project_id: string
          p_url: string
        }
        Returns: undefined
      }
      withdraw_distribution_declaration: {
        Args: { p_declaration_id: string; p_note: string }
        Returns: undefined
      }
      distribution_current_version: {
        Args: { p_project_id: string }
        Returns: number
      }
      declare_distribution: {
        Args: {
          p_declared_on?: string
          p_kind: string
          p_note?: string
          p_orchard_id?: string
          p_project_id: string
          p_proof_name?: string
          p_proof_path?: string
          p_proof_url?: string
        }
        Returns: string
      }
      generate_marketing_report: {
        Args: {
          p_activation_ids: string[]
          p_period_end: string
          p_period_start: string
          p_project_id: string
          p_recommendations: string
          p_reserves: Json
          p_rules_version: number
          p_sections: string[]
          p_summary: string
        }
        Returns: string
      }
      submit_distribution_version: {
        Args: { p_project_id: string; p_snapshot: Json }
        Returns: number
      }
      set_distribution_validator: {
        Args: { p_person_id: string; p_project_id: string }
        Returns: undefined
      }
      record_distribution_check: {
        Args: {
          p_key: string
          p_note: string
          p_project_id: string
          p_result: string
        }
        Returns: undefined
      }
      distribution_log: {
        Args: {
          p_data: Json
          p_kind: string
          p_organization_id: string
          p_project_id: string
        }
        Returns: undefined
      }
      distribution_dossier_editable: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      decide_distribution_version: {
        Args: { p_approve: boolean; p_note: string; p_version_id: string }
        Returns: undefined
      }
      can_check_distribution: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      acknowledge_master_transmission: {
        Args: { p_token: string }
        Returns: string
      }
      add_clearance_rightsholder: {
        Args: {
          p_clearance_id: string
          p_contact_id: string | null
          p_name: string
          p_right: string
          p_role: string
        }
        Returns: string
      }
      add_legal_project_contact: {
        Args: { p_contact_id: string; p_project_id: string; p_role: string }
        Returns: string
      }
      add_project_creative: {
        Args: { p_person_id: string; p_project_id: string }
        Returns: undefined
      }
      add_legal_plan_items: {
        Args: { p_items: Json; p_project_id: string }
        Returns: number
      }
      advance_clearance: {
        Args: { p_clearance_id: string; p_note: string | null; p_status: string }
        Returns: undefined
      }
      advance_contract: {
        Args: {
          p_action: string
          p_comment?: string
          p_contract_id: string
          p_signed_on?: string
        }
        Returns: undefined
      }
      advance_deliverable_delivery: {
        Args: { p_deliverable_id: string; p_step: string }
        Returns: undefined
      }
      answer_master_question: {
        Args: { p_choices?: string[]; p_question_id: string; p_text: string }
        Returns: undefined
      }
      apply_master_question: {
        Args: { p_question_id: string }
        Returns: undefined
      }
      ask_master_brief_questions: {
        Args: { p_items: Json; p_project_id: string }
        Returns: number
      }
      approve_contract_mapping: {
        Args: { p_items: Json; p_project_id: string }
        Returns: undefined
      }
      audio_state_rank: { Args: { p_state: string }; Returns: number }
      auth_organization_id: { Args: never; Returns: string }
      auth_person_id: { Args: never; Returns: string }
      brief_field_dimension: { Args: { p_field_key: string }; Returns: string }
      brief_snapshot: { Args: { p_project_id: string }; Returns: Json }
      can_admin_person: { Args: { target_person_id: string }; Returns: boolean }
      can_deposit_design_version: {
        Args: { p_deliverable_id: string; p_project_id: string }
        Returns: boolean
      }
      can_edit_contract: { Args: { p_contract_id: string }; Returns: boolean }
      can_manage_clearance: {
        Args: { p_clearance_id: string }
        Returns: boolean
      }
      can_manage_creatives: { Args: { p_project_id: string }; Returns: boolean }
      can_manage_formality: {
        Args: { p_formality_id: string }
        Returns: boolean
      }
      can_manage_split_sheet: { Args: { p_sheet_id: string }; Returns: boolean }
      can_read_project_contracts: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      can_see_call: { Args: { p_call_id: string }; Returns: boolean }
      can_see_contract: { Args: { p_contract_id: string }; Returns: boolean }
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
      check_project_shape: {
        Args: { p_master_ids: string[]; p_music_format: string; p_type: string }
        Returns: undefined
      }
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
      clearance_for_write: {
        Args: { p_clearance_id: string }
        Returns: {
          author: string | null
          created_at: string
          created_by: string | null
          element: string
          id: string
          master_id: string | null
          organization_id: string
          project_id: string
          qualified_at: string | null
          responsible_person_id: string | null
          rights_scope: string | null
          scope_reason: string | null
          source_fact_id: string | null
          status: string
          updated_at: string
          usage: string | null
          work: string
        }
        SetofOptions: {
          from: "*"
          to: "legal_clearances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clearance_missing: {
        Args: { p_clearance_id: string; p_status: string }
        Returns: string[]
      }
      clearance_rights: { Args: { p_scope: string }; Returns: string[] }
      complete_formality: {
        Args: {
          p_external_id: string | null
          p_formality_id: string
          p_iswc: string | null
          p_proof: string
        }
        Returns: undefined
      }
      confirm_release_online: {
        Args: { p_online_on: string; p_release_id: string; p_url: string }
        Returns: undefined
      }
      consolidate_split_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      contract_placeholders: { Args: { p_body: string }; Returns: string[] }
      create_contract_template: {
        Args: {
          p_body: string
          p_name: string
          p_organization_id: string
          p_roles: string[]
          p_series_id: string | null
          p_source_name?: string
          p_source_path?: string
          p_type: string
          p_usage: string | null
        }
        Returns: string
      }
      create_framing_brief: {
        Args: { p_content: Json; p_project_id: string }
        Returns: string
      }
      create_framing_call: {
        Args: {
          p_agenda: Json
          p_document_ids: string[]
          p_meeting_url: string
          p_occurred_at: string
          p_participants: Json
          p_project_id: string
          p_purpose: string
          p_title: string
        }
        Returns: string
      }
      create_design_call: {
        Args: {
          p_agenda: Json
          p_deliverable_ids: string[]
          p_format: string
          p_meeting_url: string
          p_occurred_at: string
          p_participants: Json
          p_project_id: string
          p_purpose: string
          p_title: string
        }
        Returns: string
      }
      create_production_task: {
        Args: {
          p_action_id: string
          p_assignee_person_id: string
          p_due_date: string
        }
        Returns: string
      }
      create_strategy_call: {
        Args: {
          p_agenda: Json
          p_format: string
          p_meeting_url: string
          p_occurred_at: string
          p_participants: Json
          p_project_id: string
          p_purpose: string
          p_title: string
        }
        Returns: string
      }
      create_master: {
        Args: {
          p_audio_state?: string
          p_contributors?: Json
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
      create_master_exchange: {
        Args: {
          p_agenda: Json
          p_meeting_url: string
          p_occurred_at: string
          p_project_id: string
          p_title: string
        }
        Returns: string
      }
      create_master_transmission: {
        Args: {
          p_expires_at: string
          p_note: string
          p_package: Json
          p_project_id: string
          p_role: string
        }
        Returns: string
      }
      create_project: {
        Args: {
          p_artist_id?: string
          p_assignee_person_id?: string
          p_budget_cents?: number
          p_content_format_id?: string
          p_creative_person_ids?: string[]
          p_due_date?: string
          p_initial_context?: string
          p_master_ids?: string[]
          p_music_format?: string
          p_organization_id: string
          p_priority?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      create_strategy_document: {
        Args: { p_content: Json; p_kind: string; p_project_id: string }
        Returns: string
      }
      credit_brief_engineer: {
        Args: {
          p_brief: Database["public"]["Tables"]["master_briefs"]["Row"]
          p_new_contact: string
          p_old_contact: string
          p_role: string
        }
        Returns: undefined
      }
      decide_clearance_terms: {
        Args: { p_accept: boolean; p_terms_id: string }
        Returns: undefined
      }
      decide_framing_brief: {
        Args: {
          p_approve: boolean
          p_comment?: string
          p_dimensions?: string[]
          p_validation_id: string
        }
        Returns: undefined
      }
      decide_mix_version: {
        Args: { p_decision: string; p_note: string; p_version_id: string }
        Returns: undefined
      }
      decide_production_version: {
        Args: {
          p_version_id: string
          p_decision: string
          p_note: string | null
        }
        Returns: undefined
      }
      decide_strategy_document: {
        Args: { p_approve: boolean; p_comment?: string; p_document_id: string }
        Returns: undefined
      }
      decide_validation: {
        Args: {
          p_approve: boolean
          p_comment?: string
          p_validation_id: string
        }
        Returns: undefined
      }
      declare_formality_partial: {
        Args: { p_formality_id: string; p_reason: string }
        Returns: undefined
      }
      delete_artist_row: { Args: { p_artist_id: string }; Returns: undefined }
      delete_contact_row: { Args: { p_contact_id: string }; Returns: undefined }
      delete_master_row: { Args: { p_master_id: string }; Returns: undefined }
      delete_project_row: { Args: { p_project_id: string }; Returns: undefined }
      delete_records: {
        Args: { p_ids: string[]; p_kind: string }
        Returns: {
          error: string
          record_id: string
        }[]
      }
      design_is_editable: { Args: { p_project_id: string }; Returns: boolean }
      design_can_write: { Args: { p_project_id: string }; Returns: boolean }
      design_is_open: { Args: { p_project_id: string }; Returns: boolean }
      marketing_can_contribute: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      merge_design_intentions: { Args: { p_deliverable_id: string | null; p_ids: string[]; p_target: string; p_topic: string; p_value: string }; Returns: string }
      split_design_intention: { Args: { p_id: string; p_parts: Json }; Returns: undefined }
      confirm_design_intentions: { Args: { p_deliverable_id: string | null; p_project_id: string }; Returns: string }
      assign_design_responsible: { Args: { p_person_id: string; p_project_id: string; p_scope: string; p_sheet_id: string | null }; Returns: string }
      set_design_validators: { Args: { p_people: string[]; p_project_id: string; p_scope: string; p_sheet_id: string | null }; Returns: undefined }
      set_design_validation_mode: { Args: { p_mode: string; p_project_id: string }; Returns: undefined }
      design_is_responsible: { Args: { p_project_id: string }; Returns: boolean }
      design_sheet_can_edit: { Args: { p_sheet_id: string }; Returns: boolean }
      submit_design_direction: { Args: { p_project_id: string; p_sections: string[] }; Returns: string }
      submit_design_sheet: { Args: { p_sheet_id: string }; Returns: string }
      decide_design_submission: { Args: { p_comment: string | null; p_decision: string; p_section: string; p_submission_id: string }; Returns: undefined }
      create_design_brief: { Args: { p_content: Json; p_project_id: string }; Returns: number }
      handoff_design_sheet: { Args: { p_sheet_id: string }; Returns: string }
      design_is_in_progress: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      dismiss_legal_plan_keys: {
        Args: { p_keys: string[]; p_project_id: string }
        Returns: undefined
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
      formality_for_write: {
        Args: { p_formality_id: string }
        Returns: {
          completed_at: string | null
          completion_proof: string | null
          created_at: string
          created_by: string | null
          definition_key: string
          definition_version: number
          external_id: string | null
          id: string
          master_id: string
          organization_id: string
          partial_reason: string | null
          project_id: string
          reopened: string[]
          responsible_person_id: string | null
          status: string
          submission_proof: string | null
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "legal_formalities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      formality_missing: { Args: { p_formality_id: string }; Returns: string[] }
      formality_settle: { Args: { p_formality_id: string }; Returns: undefined }
      framing_dimension_editable: {
        Args: { p_dimension: string; p_project_id: string }
        Returns: boolean
      }
      framing_is_editable: { Args: { p_project_id: string }; Returns: boolean }
      framing_is_open: { Args: { p_project_id: string }; Returns: boolean }
      framing_key_dimension: { Args: { p_key: string }; Returns: string }
      framing_stage_for_update: {
        Args: { p_project_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "project_stages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_formality_document: {
        Args: { p_formality_id: string }
        Returns: number
      }
      generate_legal_contract: {
        Args: { p_fields: Json; p_need_id: string }
        Returns: string
      }
      get_master_transmission: { Args: { p_token: string }; Returns: Json }
      get_my_access: { Args: never; Returns: Json }
      get_shared_strategy_document: { Args: { p_token: string }; Returns: Json }
      get_smartlink: { Args: { p_token: string }; Returns: Json }
      get_split_confirmation: { Args: { p_token: string }; Returns: Json }
      has_permission: {
        Args: { org_id: string; p_permission: string }
        Returns: boolean
      }
      insert_legal_plan_item: {
        Args: {
          p_item: Json
          p_org: string
          p_plan: string
          p_project_id: string
        }
        Returns: string
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
      launch_plan_workflow: {
        Args: {
          p_project_id: string
          p_title?: string
          p_why?: string
          p_workflow: string
        }
        Returns: undefined
      }
      launch_project_plan: {
        Args: { p_items: Json; p_project_id: string }
        Returns: string
      }
      legal_form_same_value: {
        Args: { p_after: Json; p_before: Json; p_key: string }
        Returns: boolean
      }
      legal_plan_item_done: {
        Args: {
          p_item: Database["public"]["Tables"]["legal_plan_items"]["Row"]
        }
        Returns: boolean
      }
      legal_plan_item_task: { Args: { p_item_id: string }; Returns: undefined }
      legal_tick_tasks: {
        Args: { p_project_ids: string[] }
        Returns: undefined
      }
      link_clearance_contract: {
        Args: { p_clearance_id: string; p_contract_id: string; p_right: string }
        Returns: undefined
      }
      list_assignable_people: {
        Args: { p_organization_id: string }
        Returns: {
          first_name: string
          last_name: string
          person_id: string
        }[]
      }
      list_contract_owners: {
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
      log_clearance_communication: {
        Args: {
          p_body: string
          p_clearance_id: string
          p_direction: string
          p_kind: string
          p_occurred_at: string | null
        }
        Returns: string
      }
      log_clearance_event: {
        Args: {
          p_clearance: Database["public"]["Tables"]["legal_clearances"]["Row"]
          p_from?: string
          p_kind: string
          p_note?: string
          p_to?: string
        }
        Returns: undefined
      }
      log_contract_event: {
        Args: {
          p_contract_id: string
          p_kind: string
          p_note?: string
          p_organization_id: string
          p_project_id: string
        }
        Returns: undefined
      }
      log_formality_event: {
        Args: {
          p_formality: Database["public"]["Tables"]["legal_formalities"]["Row"]
          p_kind: string
          p_note?: string
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
      log_split_event: {
        Args: {
          p_entry_id?: string
          p_kind: string
          p_note?: string
          p_org: string
          p_version_id: string
        }
        Returns: undefined
      }
      mark_formality_processing: {
        Args: { p_formality_id: string }
        Returns: undefined
      }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      master_is_live: { Args: { p_master_id: string }; Returns: boolean }
      new_split_confirmation: { Args: { p_entry_id: string }; Returns: string }
      normalize_email: { Args: { input: string }; Returns: string }
      mark_production_ready: {
        Args: {
          p_sheet_id: string
        }
        Returns: undefined
      }
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
      open_formality: {
        Args: { p_key: string; p_master_id: string; p_project_id: string }
        Returns: string
      }
      open_strategy_revision: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      open_master_delivery: {
        Args: { p_extension: string | null; p_master_id: string; p_token: string }
        Returns: string
      }
      person_has_permission: {
        Args: {
          p_organization_id: string
          p_permission: string
          p_person_id: string
        }
        Returns: boolean
      }
      plan_check_editable: { Args: { p_project_id: string }; Returns: string }
      plan_items_valid: { Args: { p_items: Json }; Returns: boolean }
      project_artist_name: { Args: { p_project_id: string }; Returns: string }
      create_production_call: {
        Args: {
          p_sheet_id: string
          p_title: string
          p_occurred_at: string
          p_meeting_url: string
          p_agenda: Json
          p_purpose: string
          p_participants: Json
          p_format: string
        }
        Returns: string
      }
      open_production_sheet: {
        Args: {
          p_deliverable_id: string
          p_mode: string
        }
        Returns: string
      }
      production_brief_can_write: {
        Args: {
          p_sheet_id: string
        }
        Returns: boolean
      }
      production_can_organize: {
        Args: {
          p_project_id: string
        }
        Returns: boolean
      }
      production_can_review: {
        Args: {
          p_project_id: string
        }
        Returns: boolean
      }
      production_check_default_required: {
        Args: {
          p_key: string
        }
        Returns: boolean
      }
      production_source_handoff: {
        Args: {
          p_deliverable_id: string
        }
        Returns: string
      }
      production_source_version: {
        Args: {
          p_deliverable_id: string
        }
        Returns: string
      }
      request_production_version_changes: {
        Args: {
          p_version_id: string
          p_note: string | null
        }
        Returns: undefined
      }
      save_production_brief: {
        Args: {
          p_sheet_id: string
          p_coverage: string | null
          p_camera_setup: string | null
          p_sound_capture: string | null
          p_staging_intent: string | null
          p_coverage_note: string | null
          p_camera_note: string | null
          p_sound_note: string | null
          p_run_of_show: string | null
          p_constraints_note: string | null
          p_references_note: string | null
          p_open_needs: string | null
        }
        Returns: undefined
      }
      set_production_check: {
        Args: {
          p_sheet_id: string
          p_key: string
          p_confirmed: boolean | null
          p_required: boolean | null
          p_note: string | null
        }
        Returns: undefined
      }
      set_production_director: {
        Args: {
          p_sheet_id: string
          p_person_id: string | null
          p_contact_id: string | null
        }
        Returns: undefined
      }
      project_assignment_messages: {
        Args: { p_project_id: string }
        Returns: {
          assignment_id: string
          note: string | null
          response: string | null
        }[]
      }
      project_masters_editable: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      propose_clearance_terms: {
        Args: {
          p_clearance_id: string
          p_communication_id: string | null
          p_terms: Json
        }
        Returns: string
      }
      propose_split_version: {
        Args: { p_version_id: string }
        Returns: {
          entry_id: string
          token: string
        }[]
      }
      push_secret_matches: { Args: { p_secret: string }; Returns: boolean }
      confirm_legal_intake: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      get_legal_form: { Args: { p_token: string }; Returns: Json }
      legal_name_key: { Args: { p_name: string }; Returns: string }
      launch_legal_plan: {
        Args: { p_items: Json; p_project_id: string }
        Returns: string
      }
      list_legal_people: {
        Args: { p_organization_id: string }
        Returns: {
          first_name: string
          last_name: string
          person_id: string
        }[]
      }
      qualify_clearance: {
        Args: {
          p_clearance_id: string
          p_reason: string | null
          p_responsible: string | null
          p_scope: string
          p_usage: string
        }
        Returns: undefined
      }
      record_formality_signature: {
        Args: { p_proof: string; p_signature_id: string }
        Returns: undefined
      }
      record_master_delivery: {
        Args: {
          p_file_name: string
          p_mime: string
          p_path: string
          p_token: string
        }
        Returns: string
      }
      record_release_delivery: {
        Args: {
          p_contact_id: string
          p_delivered_on: string
          p_note: string
          p_release_id: string
        }
        Returns: undefined
      }
      remind_strategy_review: {
        Args: { p_review_id: string }
        Returns: undefined
      }
      remove_clearance_rightsholder: {
        Args: { p_rightsholder_id: string }
        Returns: undefined
      }
      remove_legal_project_contact: {
        Args: { p_id: string }
        Returns: undefined
      }
      reopen_release_delivery: {
        Args: { p_release_id: string }
        Returns: undefined
      }
      require_formality_action: {
        Args: { p_fields: string[]; p_formality_id: string; p_note: string }
        Returns: undefined
      }
      respond_split_confirmation: {
        Args: {
          p_comment: string | null
          p_decision: string
          p_hash: string
          p_token: string
        }
        Returns: string
      }
      retire_legal_plan_items: {
        Args: { p_keys: string[]; p_project_id: string }
        Returns: undefined
      }
      review_legal_form: {
        Args: { p_accept: boolean; p_form_id: string }
        Returns: undefined
      }
      revise_contract_document: {
        Args: { p_body: string; p_comment: string; p_contract_id: string }
        Returns: undefined
      }
      save_formality_values: {
        Args: { p_formality_id: string; p_values: Json }
        Returns: undefined
      }
      save_project_review: {
        Args: {
          p_improve: string
          p_project_id: string
          p_results: string
          p_worked: string
        }
        Returns: undefined
      }
      save_split_draft: {
        Args: {
          p_entries: Json
          p_master_id: string
          p_note: string | null
          p_project_id: string
        }
        Returns: string
      }
      send_framing_brief: {
        Args: { p_brief_id: string; p_note?: string }
        Returns: string
      }
      send_mix_feedback: { Args: { p_version_id: string }; Returns: undefined }
      send_strategy_document: {
        Args: { p_document_id: string; p_note?: string; p_reviewers?: string[] }
        Returns: undefined
      }
      set_master_contributor_roles: {
        Args: {
          p_contact_id: string | null
          p_detail: string | null
          p_item_ids: string[]
          p_master_id: string
          p_name: string
          p_roles: string[]
        }
        Returns: undefined
      }
      set_contract_template_status: {
        Args: { p_status: string; p_template_id: string }
        Returns: undefined
      }
      set_deliverable_final: {
        Args: { p_deliverable_id: string; p_note: string; p_url: string }
        Returns: undefined
      }
      set_legal_form_state: {
        Args: { p_form_id: string; p_state: string }
        Returns: undefined
      }
      share_strategy_document: {
        Args: { p_document_id: string }
        Returns: string
      }
      split_content_hash: { Args: { p_version_id: string }; Returns: string }
      split_version_content: { Args: { p_version_id: string }; Returns: Json }
      start_strategy_stage: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      submit_formality: {
        Args: { p_formality_id: string; p_proof: string }
        Returns: undefined
      }
      submit_legal_form: {
        Args: {
          p_contribution: Json
          p_other_role: string | null
          p_person: Json
          p_roles: string[]
          p_token: string
          p_version: number
        }
        Returns: string
      }
      submit_production_version: {
        Args: {
          p_version_id: string
          p_target: string
        }
        Returns: undefined
      }
      transmit_production_team_brief: {
        Args: {
          p_sheet_id: string
          p_team: string
          p_snapshot: Json
        }
        Returns: undefined
      }
      transmit_to_activations: {
        Args: {
          p_sheet_id: string
          p_formats: string[] | null
          p_constraints: string | null
        }
        Returns: string
      }
      update_legal_plan_item: {
        Args: {
          p_due_on: string | null
          p_item_id: string
          p_responsible_person_id: string | null
        }
        Returns: undefined
      }
      prepare_legal_form: {
        Args: {
          p_contact_id: string | null
          p_credit_ids: string[]
          p_name: string
          p_network_roles: string[]
          p_prefill: Json
          p_project_id: string
          p_version: number
        }
        Returns: {
          form_id: string
          token: string
        }[]
      }
      record_legal_answer: {
        Args: {
          p_facts: Json
          p_master_id: string | null
          p_project_id: string
          p_question_key: string
          p_text: string
        }
        Returns: string
      }
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
      review_design_intention: {
        Args: {
          p_accept: boolean
          p_deliverable_id?: string
          p_intention_id: string
          p_target?: string
          p_value?: string
        }
        Returns: undefined
      }
      save_design_intention: {
        Args: {
          p_deliverable_id: string | null
          p_project_id: string
          p_topic: string
          p_value: string
        }
        Returns: string
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
      set_network_contact_archived: {
        Args: { p_archived: boolean; p_contact_id: string }
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
      start_design: { Args: { p_project_id: string }; Returns: undefined }
      start_strategy: { Args: { p_project_id: string }; Returns: undefined }
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
          p_artist_id?: string
          p_budget_cents?: number
          p_content_format_id?: string
          p_due_date?: string
          p_initial_context?: string
          p_master_ids?: string[]
          p_music_format?: string
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
      validate_production_shoot_report: {
        Args: {
          p_sheet_id: string
        }
        Returns: undefined
      }
      workflow_is_launched: {
        Args: { p_project_id: string; p_workflow: string }
        Returns: boolean
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

