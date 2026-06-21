// app/api/auth-methods/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAtLeastOneMethod } from '@/lib/validateAuthMethod'

type Method = 'totp' | 'biometric' | 'passkey'

// GET /api/auth-methods?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const defaults: Method[] = ['totp', 'biometric', 'passkey']
  const records = await prisma.userAuthMethod.findMany({ where: { userId } })

  const methods = defaults.reduce((acc, method) => {
    const found = records.find((r) => r.method === method)
    acc[method] = found?.isActive ?? false
    return acc
  }, {} as Record<Method, boolean>)

  return NextResponse.json({ methods })
}

// POST /api/auth-methods
// body: { userId, method, active }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, method, active } = body as {
    userId: string
    method: Method
    active: boolean
  }

  if (!userId || !method) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Se está desativando, valida se tem pelo menos 1 outro ativo
  if (!active) {
    try {
      await validateAtLeastOneMethod(userId, method)
    } catch {
      return NextResponse.json(
        { error: 'LAST_METHOD' },
        { status: 400 }
      )
    }
  }

  await prisma.userAuthMethod.upsert({
    where: { userId_method: { userId, method } },
    update: { isActive: active },
    create: { userId, method, isActive: active },
  })

  return NextResponse.json({ ok: true })
}
