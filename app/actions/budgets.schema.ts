import { z } from 'zod'

export const budgetSchema = z.object({
  category: z.string().trim().min(2, 'Categoria obrigatória').max(40),
  limitAmount: z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'Valor obrigatório' : 'Valor inválido',
    })
    .positive('O limite deve ser maior que zero'),
})

export type BudgetInput = z.infer<typeof budgetSchema>
