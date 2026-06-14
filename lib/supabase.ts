import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  name: string
  username: string
  phone: string
  photo?: string
}

// Busca perfil pelo ID
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

// Cria perfil após registro
export async function createProfile(profile: Profile): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .insert(profile)

  return !error
}

// Atualiza perfil
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  return !error
}

// Verifica se username já existe
export async function usernameExists(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  return !!data
}

// Verifica se phone já existe
export async function phoneExists(phone: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()

  return !!data
}
