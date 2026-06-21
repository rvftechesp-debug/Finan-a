// lib/supabaseProfile.ts
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  name: string;
  phone: string;
  username: string;
  email: string;
  photo?: string;
  totp_secret?: string | null;
}

export async function getEmailByUsername(username: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("username", username)
    .single();
  if (error || !data) return null;
  return data.email;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function createProfile(profile: Omit<Profile, "totp_secret">): Promise<boolean> {
  const { error } = await supabase.from("users").insert([profile]);
  return !error;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);
  return !error;
}

export async function phoneExists(phone: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .single();
  return !error && !!data;
}

export async function usernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single();
  return !error && !!data;
}
