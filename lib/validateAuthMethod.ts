import { prisma } from '@/lib/prisma'

type Method = 'totp' | 'biometric' | 'passkey'

// Valida se o usuário tem pelo menos 1 método ativo
// ao tentar desativar um método
export async function validateAtLeastOneMethod(
  userId: string,
  methodToDisable: Method
): Promise<void> {
  const outrosAtivos = await prisma.userAuthMethod.count({
    where: {
      userId,
      isActive: true,
      method: {
        not: methodToDisable,
      },
    },
  })

  if (outrosAtivos === 0) {
    throw new Error('LAST_METHOD')
  }
}

// Busca todos os métodos do usuário (retorna os 3 sempre)
export async function getUserAuthMethods(userId: string) {
  const methods = await prisma.userAuthMethod.findMany({
    where: { userId },
  })

  // Garante que os 3 métodos sempre existam no retorno
  const defaults: Method[] = ['totp', 'biometric', 'passkey']

  return defaults.reduce((acc, method) => {
    const found = methods.find((m) => m.method === method)
    acc[method] = found?.isActive ?? false
    return acc
  }, {} as Record<Method, boolean>)
}
