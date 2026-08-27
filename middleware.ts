import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// service role — ignora RLS
export async function middleware(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 👇 MUDANÇA 1: captura o erro de auth
const { data: { user }, error: userError } = await supabase.auth.getUser()
const pathname = request.nextUrl.pathname

// 👇 MUDANÇA 2: loga erro de token
if (userError) {
  console.log('MW AUTH ERROR:', userError.message)
}

// 🚫 BLOQUEIO GLOBAL — vale para qualquer rota
if (user) {
  const { data: blockedCheck } = await supabaseAdmin
    .from('users')
    .select('blocked')
    .eq('id', user.id)
    .maybeSingle()

  if (blockedCheck?.blocked && !pathname.startsWith('/api')) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('blocked', '1')
    return NextResponse.redirect(url)
  }
}

const isPublic = pathname === '/' || pathname.startsWith('/api')

if (!user && !isPublic) {
  const url = request.nextUrl.clone()
  url.pathname = '/'
  return NextResponse.redirect(url)
}

// /admin exige role admin
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

