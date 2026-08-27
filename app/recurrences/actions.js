// app/recurrences/actions.js
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createRecurrence(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase.from('recurrences').insert({
    user_id: user.id,
    description: formData.get('description'),
    amount: parseFloat(formData.get('amount')),
    type: formData.get('type'),
    category: formData.get('category') || null,
    day_of_month: parseInt(formData.get('day_of_month')),
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') || null,
  });

  if (error) throw error;
  revalidatePath('/recurrences');
}

export async function updateRecurrence(formData) {
  const supabase = await createClient();
  const id = formData.get('id');

  const { error } = await supabase
    .from('recurrences')
    .update({
      description: formData.get('description'),
      amount: parseFloat(formData.get('amount')),
    })
    .eq('id', id);

  if (error) throw error;
  revalidatePath('/recurrences');
}

export async function deactivateRecurrence(formData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('recurrences')
    .update({ is_active: false })
    .eq('id', formData.get('id'));

  if (error) throw error;
  revalidatePath('/recurrences');
}
