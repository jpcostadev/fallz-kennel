import { describe, expect, it } from 'vitest'
import { createDogSchema } from './dog'

describe('createDogSchema', () => {
  it('valida e normaliza um cadastro válido', () => {
    const dog = createDogSchema.parse({
      name: '  Zara  ',
      sex: 'female',
      birthDate: '2026-07-04',
      breed: 'American Bully Standard'
    })

    expect(dog.name).toBe('Zara')
    expect(dog.status).toBe('puppy')
    expect(dog.notes).toBe('')
  })

  it('rejeita data e nome inválidos', () => {
    const result = createDogSchema.safeParse({
      name: '',
      sex: 'female',
      birthDate: '04/07/2026',
      breed: 'American Bully Standard'
    })

    expect(result.success).toBe(false)
  })
})
