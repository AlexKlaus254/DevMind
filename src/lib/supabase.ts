import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKeyRaw = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

const supabaseUrl = supabaseUrlRaw?.trim();
const supabaseAnonKey = supabaseAnonKeyRaw?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in development if env vars are missing
  throw new Error(
    "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

