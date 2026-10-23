import { describe, expect, it } from 'vitest'

import { jambLabelInline } from '#/domain/config'

describe('jambLabelInline', () => {
  it('lower-cases only the first letter, keeping the jamb codes', () => {
    expect(jambLabelInline('wide')).toBe('bao che rộng (JD320)')
    expect(jambLabelInline('narrow')).toBe('bao che hẹp (35×50)')
  })
})
