import { notFound } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { ERROR_TEXT, errorMessage } from '#/lib/error-message'

describe('errorMessage', () => {
  it('maps notFound()', () => {
    expect(errorMessage(notFound(), true)).toBe(ERROR_TEXT.notFound)
  })

  it.each([
    'Failed to fetch',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
  ])('maps the browser network error %j', (msg) => {
    expect(errorMessage(new TypeError(msg), true)).toBe(ERROR_TEXT.network)
  })

  it('reports the network while offline, whatever the error', () => {
    expect(errorMessage(new Error('boom'), false)).toBe(ERROR_TEXT.network)
  })

  it('takes the first message of a serialised Zod issue list', () => {
    const issues = [
      {
        code: 'too_small',
        path: ['name'],
        message: 'Tên công trình không được để trống.',
      },
      { code: 'too_big', path: ['address'], message: 'Quá dài.' },
    ]
    expect(errorMessage(new Error(JSON.stringify(issues)), true)).toBe(
      'Tên công trình không được để trống.',
    )
  })

  it('keeps our own Vietnamese messages', () => {
    expect(
      errorMessage(new Error('“a.json” không phải file JSON hợp lệ.'), true),
    ).toBe('“a.json” không phải file JSON hợp lệ.')
  })

  it('hides English internals', () => {
    const zodEnglish = JSON.stringify([
      { message: 'Invalid input: expected string' },
    ])
    expect(errorMessage(new Error('D1_ERROR: no such table'), true)).toBe(
      ERROR_TEXT.generic,
    )
    expect(errorMessage(new Error(zodEnglish), true)).toBe(ERROR_TEXT.generic)
    expect(errorMessage('weird', true)).toBe(ERROR_TEXT.generic)
  })

  it('does not treat a non-issue JSON array as Zod', () => {
    expect(errorMessage(new Error('[1,2]'), true)).toBe(ERROR_TEXT.generic)
  })
})

describe('errorMessage on the server', () => {
  it('a navigator without onLine (Workers, Node) is not offline', () => {
    // Node 21+ has a global navigator without onLine, like Workers: the default applies.
    expect(errorMessage(new Error('Tên công trình không được để trống.'))).toBe(
      'Tên công trình không được để trống.',
    )
  })
})
