import * as React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { parseSupabaseError } from "../lib/errorHandler";
import type { Database } from "../types/database";

export type NotificationSettingsRow =
  Database["public"]["Tables"]["notification_settings"]["Row"];

const DEFAULT_SETTINGS = {
  channel: ["browser"] as string[],
  reminder_style: "smart",
  silence_threshold_days: 5,
  end_of_project_prompt: true,
  weekly_digest: true,
};

export type NotificationSettingsPayload = {
  channel?: string[];
  reminder_style?: string;
  custom_days?: number[] | null;
  preferred_time?: string | null;
  timezone?: string | null;
  silence_threshold_days?: number;
  end_of_project_prompt?: boolean;
  weekly_digest?: boolean;
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<NotificationSettingsRow | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async () => {
    if (!user?.id) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (err) {
      setError(parseSupabaseError(err));
      setSettings(null);
      setLoading(false);
      return;
    }
    if (data) {
      setSettings(data as NotificationSettingsRow);
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("notification_settings")
        .insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        })
        .select()
        .single();
      if (insertErr) {
        setError(parseSupabaseError(insertErr));
        setSettings(null);
      } else {
        setSettings(inserted as NotificationSettingsRow);
      }
    }
    setLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = React.useCallback(
    async (data: NotificationSettingsPayload): Promise<boolean> => {
      if (!user?.id) return false;
      setError(null);
      const row = {
        user_id: user.id,
        channel: data.channel ?? settings?.channel ?? DEFAULT_SETTINGS.channel,
        reminder_style:
          data.reminder_style ??
          settings?.reminder_style ??
          DEFAULT_SETTINGS.reminder_style,
        custom_days: data.custom_days ?? settings?.custom_days ?? null,
        preferred_time: data.preferred_time ?? settings?.preferred_time ?? null,
        timezone: data.timezone ?? settings?.timezone ?? null,
        silence_threshold_days:
          data.silence_threshold_days ??
          settings?.silence_threshold_days ??
          DEFAULT_SETTINGS.silence_threshold_days,
        end_of_project_prompt:
          data.end_of_project_prompt ??
          settings?.end_of_project_prompt ??
          DEFAULT_SETTINGS.end_of_project_prompt,
        weekly_digest:
          data.weekly_digest ??
          settings?.weekly_digest ??
          DEFAULT_SETTINGS.weekly_digest,
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
