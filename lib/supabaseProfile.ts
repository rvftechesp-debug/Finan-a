import { supabase } from "@/lib/supabase";

// ── Tipo espelhando a tabela public.users ──────────────────────
export interface Profile {
  id: string;
  name: string;
  phone: string;
  username: string;
  photo?: string;
}

// ── Busca perfil pelo UUID do auth ─────────────────────────────
export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, phone, username, photo")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

// ── Cria perfil após signUp ────────────────────────────────────
export async function createProfile(profile: Profile): Promise<boolean> {
  const { error } = await supabase.from("users").insert({
    id:       profile.id,
    name:     profile.name,
    phone:    profile.phone,
    username: profile.username,
    photo:    profile.photo ?? null,
    email:    null,
  });

  return !error;
}

// ── Atualiza campos do perfil ──────────────────────────────────
export async function updateProfile(
  id: string,
  fields: Partial<Pick<Profile, "name" | "phone" | "photo" | "username">>
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", id);

  return !error;
}

// ── Verifica se username já existe ────────────────────────────
export async function usernameExists(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return !!data;
}

// ── Verifica se telefone já existe ────────────────────────────
export async function phoneExists(phone: string): Promise<boolean> {
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  return !!data;
}
