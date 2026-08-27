// services/recurrences.js
import { supabase } from '@/lib/supabase';

// LISTAR (ativas por padrão)
export async function getRecurrences({ onlyActive = true } = {}) {
  let query = supabase
    .from('recurrences')
    .select('*')
    .order('day_of_month', { ascending: true });

  if (onlyActive) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// BUSCAR UMA
export async function getRecurrenceById(id) {
  const { data, error } = await supabase
    .from('recurrences')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// CRIAR
export async function createRecurrence(payload) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('recurrences')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// EDITAR
export async function updateRecurrence(id, payload) {
  const { data, error } = await supabase
    .from('recurrences')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// SOFT DELETE (recomendado)
export async function deactivateRecurrence(id) {
  const { data, error } = await supabase
    .from('recurrences')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// DELETE definitivo
export async function deleteRecurrence(id) {
  const { error } = await supabase
    .from('recurrences')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
