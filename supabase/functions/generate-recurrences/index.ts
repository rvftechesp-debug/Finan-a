// supabase/functions/generate-recurrences/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // protege o endpoint com um secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // client admin (bypass RLS) — roda sem sessão de usuário
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  const lastDay = new Date(year, month + 1, 0).getDate()

  // busca TODAS as recorrências ativas (de todos os usuários)
  const { data: recs, error } = await supabase
    .from('recurrences')
    .select('*')
    .eq('active', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  if (!recs?.length) {
    return new Response(JSON.stringify({ inserted: 0 }), { status: 200 })
  }

  const rows = recs.map((r) => {
    const day = Math.min(r.day_of_month, lastDay)
    const due = new Date(year, month, day)
    return {
      user_id: r.user_id, // preserva o dono da recorrência
      recurrence_id: r.id,
      description: r.description,
      amount: r.amount,
      category: r.category,
      type: r.type,
      due_date: due.toISOString().slice(0, 10),
    }
  })

  const { error: insErr, count } = await supabase
    .from('transactions')
    .upsert(rows, {
      onConflict: 'recurrence_id,due_date',
      ignoreDuplicates: true,
      count: 'exact',
    })

  if (insErr) {
    return new Response(JSON.stringify({ error: insErr.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ inserted: count ?? 0 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})
