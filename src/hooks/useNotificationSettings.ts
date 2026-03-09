import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError, isSessionExpiredError } from "../lib/errorHandler";
import type { Database } from "../types/database";

export type NotificationSettingsRow =
  Database["public"]["Tables"]["notification_settings"]["Row"];

const DEFAULT_SETTINGS = {
  channel: ["browser"] as string[],
  reminder_style: "smart",
  silence_threshold_days: 5,
  silence_threshold_hours: 120,
  end_of_project_prompt: true,
  weekly_digest: true,
  plan_reminder_enabled: true,
  plan_reminder_style: "morning",
  plan_reminder_time: "08:00",
  plan_reminder_custom_time: null as string | null,
};

export type NotificationSettingsPayload = {
  channel?: string[];
  reminder_style?: string;
  custom_days?: number[] | null;
  preferred_time?: string | null;
  timezone?: string | null;
  silence_threshold_days?: number;
  silence_threshold_hours?: number;
  end_of_project_prompt?: boolean;
  weekly_digest?: boolean;
  telegram_chat_id?: string | null;
  notification_email?: string | null;
  scheduled_days?: string[] | null;
  scheduled_time?: string | null;
  scheduled_timezone?: string | null;
  plan_reminder_enabled?: boolean;
  plan_reminder_style?: string | null;
  plan_reminder_time?: string | null;
  plan_reminder_custom_time?: string | null;
};

export function useNotificationSettings() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = React.useState<NotificationSettingsRow | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async (): Promise<NotificationSettingsRow | null> => {
    if (!user?.id) {
      setSettings(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (err) {
        if (isSessionExpiredError(err)) {
          signOut({ sessionExpired: true });
          return null;
        }
        setError(parseSupabaseError(err));
        setSettings(null);
        setLoading(false);
        return null;
      }
      if (data) {
        const row = data as NotificationSettingsRow;
        if (row.silence_threshold_hours == null) {
          const days =
            row.silence_threshold_days ?? DEFAULT_SETTINGS.silence_threshold_days;
          row.silence_threshold_hours =
            days != null ? days * 24 : DEFAULT_SETTINGS.silence_threshold_hours;
        }
        if (row.plan_reminder_enabled == null) {
          row.plan_reminder_enabled = DEFAULT_SETTINGS.plan_reminder_enabled;
        }
        if (row.plan_reminder_style == null) {
          row.plan_reminder_style = DEFAULT_SETTINGS.plan_reminder_style;
        }
        if (row.plan_reminder_time == null) {
          row.plan_reminder_time = DEFAULT_SETTINGS.plan_reminder_time;
        }
        setSettings(row);
        return row;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("notification_settings")
          .insert({
            user_id: user.id,
            ...DEFAULT_SETTINGS,
            silence_threshold_hours: DEFAULT_SETTINGS.silence_threshold_hours,
          })
          .select()
          .single();
        if (insertErr) {
          if (isSessionExpiredError(insertErr)) {
            signOut({ sessionExpired: true });
            return null;
          }
          setError(parseSupabaseError(insertErr));
          setSettings(null);
          return null;
        } else {
          const row = inserted as NotificationSettingsRow;
          setSettings(row);
          return row;
        }
      }
    } catch (e) {
      setError(parseSupabaseError(e as Parameters<typeof parseSupabaseError>[0]));
      setSettings(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, signOut]);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = React.useCallback(
    async (data: NotificationSettingsPayload): Promise<boolean> => {
      if (!user?.id) return false;
      setError(null);

      const existing = settings;
      const hours =
        data.silence_threshold_hours ??
        existing?.silence_threshold_hours ??
        (existing?.silence_threshold_days != null
          ? existing.silence_threshold_days * 24
          : DEFAULT_SETTINGS.silence_threshold_hours);
      const days =
        data.silence_threshold_days ??
        existing?.silence_threshold_days ??
        Math.max(1, Math.round(hours / 24));

      const row = {
        user_id: user.id,
        channel:
          data.channel ?? settings?.channel ?? DEFAULT_SETTINGS.channel,
        reminder_style:
          data.reminder_style ??
          settings?.reminder_style ??
          DEFAULT_SETTINGS.reminder_style,
        custom_days: data.custom_days ?? settings?.custom_days ?? null,
        preferred_time: data.preferred_time ?? settings?.preferred_time ?? null,
        timezone: data.timezone ?? settings?.timezone ?? null,
        silence_threshold_days: days,
        silence_threshold_hours: hours,
        end_of_project_prompt:
          data.end_of_project_prompt ??
          settings?.end_of_project_prompt ??
          DEFAULT_SETTINGS.end_of_project_prompt,
        weekly_digest:
          data.weekly_digest ??
          settings?.weekly_digest ??
          DEFAULT_SETTINGS.weekly_digest,
        telegram_chat_id:
          data.telegram_chat_id ?? settings?.telegram_chat_id ?? null,
        notification_email:
          data.notification_email ?? settings?.notification_email ?? null,
        scheduled_days:
          data.scheduled_days ?? settings?.scheduled_days ?? null,
        scheduled_time:
          data.scheduled_time ?? settings?.scheduled_time ?? null,
        scheduled_timezone:
          data.scheduled_timezone ?? settings?.scheduled_timezone ?? null,
        plan_reminder_enabled:
          data.plan_reminder_enabled ??
          settings?.plan_reminder_enabled ??
          DEFAULT_SETTINGS.plan_reminder_enabled,
        plan_reminder_style:
          data.plan_reminder_style ??
          settings?.plan_reminder_style ??
          DEFAULT_SETTINGS.plan_reminder_style,
        plan_reminder_time:
          data.plan_reminder_time ??
          settings?.plan_reminder_time ??
          DEFAULT_SETTINGS.plan_reminder_time,
        plan_reminder_custom_time:
          data.plan_reminder_custom_time ??
          settings?.plan_reminder_custom_time ??
          DEFAULT_SETTINGS.plan_reminder_custom_time,
      };
      const { data: updated, error: err } = await supabase
        .from("notification_settings")
        .upsert(row, {
          onConflict: "user_id",
        })
        .select()
        .single();
      if (err) {
        setError(parseSupabaseError(err));
        return false;
      }
      setSettings(updated as NotificationSettingsRow);
      return true;
    },
    [user?.id, settings],
  );

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
    defaultSettings: DEFAULT_SETTINGS,
  };
}
