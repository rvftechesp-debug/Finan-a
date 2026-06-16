// @/lib/supabaseProfile.ts
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  name: string;
  phone: string;
  username: string;
  email: string;
  photo?: string;
  totp_secret?: string;
}

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, username, email, photo, totp_secret")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function createProfile(profile: Profile): Promise<boolean> {
  const { error } = await supabase.from("users").insert({
    id:          profile.id,
    name:        profile.name,
    phone:       profile.phone,
    username:    profile.username,
    email:       profile.email,
    photo:       profile.photo ?? null,
    totp_secret: profile.totp_secret ?? null,
  });
  return !error;
}

export async function updateProfile(
  id: string,
  fields: Partial<Pick<Profile, "name" | "phone" | "photo" | "username" | "email" | "totp_secret">>
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", id);
  return !error;
}

export async function usernameExists(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  return !!data;
}

export async function phoneExists(phone: string): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  return !!data;
}

export async function emailExists(email: string): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!data;
}

export async function getEmailByUsername(username: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("email")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return data?.email ?? null;
}

export async function getTotpSecretByUserId(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("totp_secret")
    .eq("id", id)
    .maybeSingle();
  return data?.totp_secret ?? null;
}
