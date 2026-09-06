import { describe, expect, it } from 'vitest'
import { kennelSettingsSchema, moduleRecordInputSchema } from './module'

describe('moduleRecordInputSchema', () => {
  it('valida um lançamento financeiro', () => {
    const record = moduleRecordInputSchema.parse({ module: 'finance', title: 'Ração', category: 'Ração', date: '2026-09-06', description: 'Compra mensal', amount: 350.5, transactionType: 'expense' })
    expect(record.amount).toBe(350.5)
  })

  it('não aceita valor negativo', () => {
    expect(moduleRecordInputSchema.safeParse({ module: 'finance', title: 'Ração', category: 'Despesas', date: '2026-09-06', amount: -1 }).success).toBe(false)
  })
})

describe('kennelSettingsSchema', () => {
  it('valida as configurações principais', () => {
    expect(kennelSettingsSchema.safeParse({ kennelName: 'Fallz Kennel', owner: '', phone: '', email: '', city: '', state: 'SP', mainBreed: 'American Bully' }).success).toBe(true)
  })
})
