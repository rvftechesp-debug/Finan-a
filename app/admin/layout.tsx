import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import "../globals.css";


export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  console.log('USER:', user?.id, user?.email)

  if (!user) redirect('/login')

  const { data: profile, error } = await supabaseAdmin
  .from('users')
  .select('role')
  .eq('id', user.id)
  .maybeSingle()

console.log('PROFILE:', profile, 'ERROR:', error)

if (profile?.role !== 'admin') redirect('/')

  return <>{children}</>
}

