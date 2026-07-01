import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const { id } = await request.json()

  await supabaseAdmin
    .from('users')
    .update({ last_access: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
