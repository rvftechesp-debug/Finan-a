// app/actions/recurrences.schema.ts
import { z } from 'zod'

export const recurrenceSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, 'Descrição deve ter no mínimo 2 caracteres')
    .max(80, 'Descrição muito longa'),
  amount: z
  .number({ error: 'Valor inválido' })
  .positive('O valor deve ser maior que zero'),
  category: z
    .string()
    .trim()
    .min(2, 'Categoria obrigatória')
    .max(40, 'Categoria muito longa'),
  type: z.enum(['expense', 'income'], {
  error: 'Tipo inválido',
}),
  dayOfMonth: z
  .number({ error: 'Dia inválido' })
  .int('Dia deve ser inteiro')
  .min(1, 'Dia mínimo é 1')
  .max(31, 'Dia máximo é 31'),

})

export type RecurrenceInput = z.infer<typeof recurrenceSchema>
