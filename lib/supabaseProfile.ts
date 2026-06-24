import { supabase } from "@/lib/supabase";

export { supabase };

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  photo: string;
  totp_secret: string | null;
};
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // ✅ corrigido
  if (error) throw error;
  return data;
}

export async function createProfile(userId: string, fields: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("users")
    .insert({ id: userId, ...fields })
    .select()
    .maybeSingle(); // ✅ corrigido
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, fields: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", userId)
    .select()
    .maybeSingle(); // ✅ corrigido
  if (error) throw error;
  return data;
}

export async function getEmailByUsername(username: string) {
  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("username", username)
    .maybeSingle(); // ✅ corrigido — era a causa do erro 406 no login
  if (error) throw error;
  return data?.email ?? null;
}

export async function phoneExists(phone: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle(); // já estava correto ✅
  if (error) throw error;
  return data !== null;
}
