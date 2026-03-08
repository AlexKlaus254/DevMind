export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      org_settings: {
        Row: {
          id: string;
          org_id: string | null;
          weekly_digest_enabled: boolean | null;
          digest_day: string | null;
          digest_time: string | null;
          silence_alert_days: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          weekly_digest_enabled?: boolean | null;
          digest_day?: string | null;
          digest_time?: string | null;
          silence_alert_days?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          weekly_digest_enabled?: boolean | null;
          digest_day?: string | null;
          digest_time?: string | null;
          silence_alert_days?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_invites: {
        Row: {
          id: string;
          org_id: string | null;
          code: string;
          created_by: string | null;
          used_by: string | null;
          used_at: string | null;
          expires_at: string | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          code: string;
          created_by?: string | null;
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          code?: string;
          created_by?: string | null;
          used_by?: string | null;
          used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_invites_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_invites_used_by_fkey";
            columns: ["used_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          name: string | null;
          role: string | null;
          primary_skill: string | null;
          growth_definition: string | null;
          org_id: string | null;
          onboarding_complete: boolean | null;
          created_at: string | null;
          team_notes: string | null;
          joined_org_at: string | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          role?: string | null;
          primary_skill?: string | null;
          growth_definition?: string | null;
          org_id?: string | null;
          onboarding_complete?: boolean | null;
          created_at?: string | null;
          team_notes?: string | null;
          joined_org_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          role?: string | null;
          primary_skill?: string | null;
          growth_definition?: string | null;
          org_id?: string | null;
          onboarding_complete?: boolean | null;
          created_at?: string | null;
          team_notes?: string | null;
          joined_org_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          type: string | null;
          is_solo: boolean | null;
          has_deadline: boolean | null;
          deadline_date: string | null;
          tech_stack: string[] | null;
          motivation: string | null;
          skill_to_improve: string | null;
          success_definition: string | null;
          abandonment_risk: string | null;
          status: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          type?: string | null;
          is_solo?: boolean | null;
          has_deadline?: boolean | null;
          deadline_date?: string | null;
          tech_stack?: string[] | null;
          motivation?: string | null;
          skill_to_improve?: string | null;
          success_definition?: string | null;
          abandonment_risk?: string | null;
          status?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          type?: string | null;
          is_solo?: boolean | null;
          has_deadline?: boolean | null;
          deadline_date?: string | null;
          tech_stack?: string[] | null;
          motivation?: string | null;
          skill_to_improve?: string | null;
          success_definition?: string | null;
          abandonment_risk?: string | null;
          status?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_entries: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string | null;
          energy_score: number | null;
          confidence_score: number | null;
          mood_word: string | null;
          was_blocked: boolean | null;
          blocker_note: string | null;
          still_motivated: string | null;
          reflection: string | null;
          entry_mode: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id?: string | null;
          energy_score?: number | null;
          confidence_score?: number | null;
          mood_word?: string | null;
          was_blocked?: boolean | null;
          blocker_note?: string | null;
          still_motivated?: string | null;
          reflection?: string | null;
          entry_mode?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          user_id?: string | null;
          energy_score?: number | null;
          confidence_score?: number | null;
          mood_word?: string | null;
          was_blocked?: boolean | null;
          blocker_note?: string | null;
          still_motivated?: string | null;
          reflection?: string | null;
          entry_mode?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "journal_entries_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entries_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_postmortems: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string | null;
          was_rushed: string | null;
          was_overwhelmed: string | null;
          satisfaction_score: number | null;
          scope_changed: boolean | null;
          closing_note: string | null;
          ai_summary: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id?: string | null;
          was_rushed?: string | null;
          was_overwhelmed?: string | null;
          satisfaction_score?: number | null;
          scope_changed?: boolean | null;
          closing_note?: string | null;
          ai_summary?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          user_id?: string | null;
          was_rushed?: string | null;
          was_overwhelmed?: string | null;
          satisfaction_score?: number | null;
          scope_changed?: boolean | null;
          closing_note?: string | null;
          ai_summary?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_postmortems_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_postmortems_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string | null;
          insight_text: string | null;
          insight_type: string | null;
          generated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          insight_text?: string | null;
          insight_type?: string | null;
          generated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          insight_text?: string | null;
          insight_type?: string | null;
          generated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_insights_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      silence_records: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          date: string;
          reminder_was_sent: boolean | null;
          reminder_was_opened: boolean | null;
          user_responded: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          date: string;
          reminder_was_sent?: boolean | null;
          reminder_was_opened?: boolean | null;
          user_responded?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          date?: string;
          reminder_was_sent?: boolean | null;
          reminder_was_opened?: boolean | null;
          user_responded?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "silence_records_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "silence_records_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      onboarding_baseline: {
        Row: {
          id: string;
          user_id: string | null;
          projects_started_last_6m: number | null;
          projects_completed_last_6m: number | null;
          common_abandonment_reason: string | null;
          self_consistency_rating: number | null;
          three_month_goal: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          projects_started_last_6m?: number | null;
          projects_completed_last_6m?: number | null;
          common_abandonment_reason?: string | null;
          self_consistency_rating?: number | null;
          three_month_goal?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          projects_started_last_6m?: number | null;
          projects_completed_last_6m?: number | null;
          common_abandonment_reason?: string | null;
          self_consistency_rating?: number | null;
          three_month_goal?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_baseline_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      error_logs: {
        Row: {
          id: string;
          user_id: string | null;
          context: string | null;
          message: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          context?: string | null;
          message?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          context?: string | null;
          message?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "error_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_settings: {
        Row: {
          id: string;
          user_id: string | null;
          channel: string[] | null;
          reminder_style: string | null;
          custom_days: number[] | null;
          preferred_time: string | null;
          timezone: string | null;
          silence_threshold_days: number | null;
          end_of_project_prompt: boolean | null;
          weekly_digest: boolean | null;
          telegram_chat_id: string | null;
          notification_email: string | null;
          silence_threshold_hours: number | null;
          scheduled_days: string[] | null;
          scheduled_time: string | null;
          scheduled_timezone: string | null;
          plan_reminder_enabled: boolean | null;
          plan_reminder_time: string | null;
          plan_reminder_style: string | null;
          plan_reminder_custom_time: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          channel?: string[] | null;
          reminder_style?: string | null;
          custom_days?: number[] | null;
          preferred_time?: string | null;
          timezone?: string | null;
          silence_threshold_days?: number | null;
          end_of_project_prompt?: boolean | null;
          weekly_digest?: boolean | null;
          telegram_chat_id?: string | null;
          notification_email?: string | null;
          silence_threshold_hours?: number | null;
          scheduled_days?: string[] | null;
          scheduled_time?: string | null;
          scheduled_timezone?: string | null;
          plan_reminder_enabled?: boolean | null;
          plan_reminder_time?: string | null;
          plan_reminder_style?: string | null;
          plan_reminder_custom_time?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          channel?: string[] | null;
          reminder_style?: string | null;
          custom_days?: number[] | null;
          preferred_time?: string | null;
          timezone?: string | null;
          silence_threshold_days?: number | null;
          end_of_project_prompt?: boolean | null;
          weekly_digest?: boolean | null;
          telegram_chat_id?: string | null;
          notification_email?: string | null;
          silence_threshold_hours?: number | null;
          scheduled_days?: string[] | null;
          scheduled_time?: string | null;
          scheduled_timezone?: string | null;
          plan_reminder_enabled?: boolean | null;
          plan_reminder_time?: string | null;
          plan_reminder_style?: string | null;
          plan_reminder_custom_time?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_tasks: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          title: string;
          description: string | null;
          planned_date: string;
          planned_start_time: string | null;
          planned_duration_minutes: number | null;
          actual_start_time: string | null;
          actual_duration_minutes: number | null;
          status: string | null;
          completion_note: string | null;
          skip_reason: string | null;
          notify_at_start: boolean | null;
          notify_before_minutes: number | null;
          created_at: string | null;
          updated_at: string | null;
          recurring_task_id: string | null;
          is_recurring: boolean | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          title: string;
          description?: string | null;
          planned_date?: string;
          planned_start_time?: string | null;
          planned_duration_minutes?: number | null;
          actual_start_time?: string | null;
          actual_duration_minutes?: number | null;
          status?: string | null;
          completion_note?: string | null;
          skip_reason?: string | null;
          notify_at_start?: boolean | null;
          notify_before_minutes?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          recurring_task_id?: string | null;
          is_recurring?: boolean | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          planned_date?: string;
          planned_start_time?: string | null;
          planned_duration_minutes?: number | null;
          actual_start_time?: string | null;
          actual_duration_minutes?: number | null;
          status?: string | null;
          completion_note?: string | null;
          skip_reason?: string | null;
          notify_at_start?: boolean | null;
          notify_before_minutes?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          recurring_task_id?: string | null;
          is_recurring?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_tasks_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_tasks_recurring_task_id_fkey";
            columns: ["recurring_task_id"];
            referencedRelation: "recurring_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      recurring_tasks: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          title: string;
          description: string | null;
          frequency: string;
          custom_days: string[] | null;
          planned_start_time: string | null;
          planned_duration_minutes: number | null;
          notify_at_start: boolean | null;
          notify_before_minutes: number | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          title: string;
          description?: string | null;
          frequency: string;
          custom_days?: string[] | null;
          planned_start_time?: string | null;
          planned_duration_minutes?: number | null;
          notify_at_start?: boolean | null;
          notify_before_minutes?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          title?: string;
          description?: string | null;
          frequency?: string;
          custom_days?: string[] | null;
          planned_start_time?: string | null;
          planned_duration_minutes?: number | null;
          notify_at_start?: boolean | null;
          notify_before_minutes?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_tasks_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      break_days: {
        Row: {
          id: string;
          user_id: string | null;
          date: string;
          break_type: string | null;
          note: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          date: string;
          break_type?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          date?: string;
          break_type?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "break_days_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_plan_records: {
        Row: {
          id: string;
          user_id: string | null;
          date: string;
          planned_at: string | null;
          task_count: number | null;
          is_break_day: boolean | null;
          plan_filled: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          date: string;
          planned_at?: string | null;
          task_count?: number | null;
          is_break_day?: boolean | null;
          plan_filled?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          date?: string;
          planned_at?: string | null;
          task_count?: number | null;
          is_break_day?: boolean | null;
          plan_filled?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "daily_plan_records_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      atomic_habits: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          frequency: string | null;
          custom_days: string[] | null;
          target_time: string | null;
          cue: string | null;
          reward: string | null;
          category: string | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          frequency?: string | null;
          custom_days?: string[] | null;
          target_time?: string | null;
          cue?: string | null;
          reward?: string | null;
          category?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          frequency?: string | null;
          custom_days?: string[] | null;
          target_time?: string | null;
          cue?: string | null;
          reward?: string | null;
          category?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "atomic_habits_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      habit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          habit_id: string | null;
          date: string;
          completed: boolean | null;
          skipped: boolean | null;
          skip_reason: string | null;
          notes: string | null;
          logged_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          habit_id?: string | null;
          date: string;
          completed?: boolean | null;
          skipped?: boolean | null;
          skip_reason?: string | null;
          notes?: string | null;
          logged_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          habit_id?: string | null;
          date?: string;
          completed?: boolean | null;
          skipped?: boolean | null;
          skip_reason?: string | null;
          notes?: string | null;
          logged_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "habit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "habit_logs_habit_id_fkey";
            columns: ["habit_id"];
            referencedRelation: "atomic_habits";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      team_aggregate_view: {
        Row: {
          org_id: string | null;
          total_members: number | null;
          avg_energy: number | null;
          avg_confidence: number | null;
          completed_projects: number | null;
          abandoned_projects: number | null;
          active_projects: number | null;
          total_silence_days: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

