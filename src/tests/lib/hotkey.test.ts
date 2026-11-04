import { describe, expect, it } from 'vitest'

import { ariaHotkey, formatHotkey, isTypingTarget, matchHotkey } from '#/lib/hotkey'

const key = (k: string, mods: Partial<Record<'meta' | 'ctrl' | 'shift' | 'alt', boolean>> = {}) => ({
  key: k,
  metaKey: Boolean(mods.meta),
  ctrlKey: Boolean(mods.ctrl),
  shiftKey: Boolean(mods.shift),
  altKey: Boolean(mods.alt),
})

describe('matchHotkey', () => {
  it('mod is ⌘ on Apple, Ctrl elsewhere', () => {
    expect(matchHotkey(key('s', { meta: true }), 'mod+s', true)).toBe(true)
    expect(matchHotkey(key('s', { ctrl: true }), 'mod+s', true)).toBe(false)
    expect(matchHotkey(key('s', { ctrl: true }), 'mod+s', false)).toBe(true)
    expect(matchHotkey(key('s', { meta: true }), 'mod+s', false)).toBe(false)
  })

  it('ignores case (Caps Lock) but not extra modifiers', () => {
    expect(matchHotkey(key('S', { ctrl: true }), 'mod+s', false)).toBe(true)
    expect(matchHotkey(key('s', { ctrl: true, shift: true }), 'mod+s', false)).toBe(false)
    expect(matchHotkey(key('p', { ctrl: true, alt: true }), 'mod+p', false)).toBe(false)
  })

  it('a bare key needs no modifier', () => {
    expect(matchHotkey(key('/'), '/', false)).toBe(true)
    expect(matchHotkey(key('/', { ctrl: true }), '/', false)).toBe(false)
  })

  it('a bare character typed with Shift or AltGr (German, French layouts) still matches', () => {
    expect(matchHotkey(key('/', { shift: true }), '/', false)).toBe(true)
    expect(matchHotkey(key('/', { shift: true }), '/', true)).toBe(true)
  })
})

describe('formatHotkey / ariaHotkey', () => {
  it('formats per platform', () => {
    expect(formatHotkey('mod+s', true)).toBe('⌘ S')
    expect(formatHotkey('mod+p', false)).toBe('Ctrl P')
    expect(formatHotkey('/', false)).toBe('/')
    expect(ariaHotkey('mod+s', true)).toBe('Meta+S')
    expect(ariaHotkey('mod+s', false)).toBe('Control+S')
  })
})

describe('isTypingTarget', () => {
  const el = (tagName: string, extra: object = {}) =>
    ({ tagName, ...extra }) as unknown as EventTarget

  it('text fields, textarea, select and contenteditable take typing', () => {
    expect(isTypingTarget(el('INPUT', { type: 'text' }))).toBe(true)
    expect(isTypingTarget(el('INPUT', { type: 'search' }))).toBe(true)
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true)
    expect(isTypingTarget(el('SELECT'))).toBe(true)
    expect(isTypingTarget(el('DIV', { isContentEditable: true }))).toBe(true)
  })

  it('buttons, checkboxes and the window do not', () => {
    expect(isTypingTarget(el('INPUT', { type: 'checkbox' }))).toBe(false)
    expect(isTypingTarget(el('BUTTON'))).toBe(false)
    expect(isTypingTarget(el('DIV', { isContentEditable: false }))).toBe(false)
    expect(isTypingTarget({} as EventTarget)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
