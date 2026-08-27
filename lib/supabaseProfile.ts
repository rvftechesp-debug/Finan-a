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
  plan?: string;
  last_access?: string | null;
};

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("getProfile error:", error.message, error.code);
    return null;
  }
  return data;
}


export async function createProfile(
  userId: string,
  fields: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("users")
    .insert({ id: userId, ...fields })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  fields: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getEmailByUsername(username: string) {
  const { data } = await supabase.rpc("get_email_by_username", {
  p_username: username,
});
return data ?? null;

}

export async function phoneExists(phone: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
