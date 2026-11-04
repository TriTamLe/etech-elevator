// Keyboard shortcuts, written like "mod+s": `mod` is ⌘ on Apple platforms and Ctrl
// elsewhere; other modifiers are shift/alt; the last part is the key (case-insensitive).

type KeyLike = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
>

export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
}

function parse(hotkey: string) {
  const parts = hotkey.toLowerCase().split('+')
  const key = parts.pop() ?? ''
  return {
    key,
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  }
}

export function matchHotkey(
  event: KeyLike,
  hotkey: string,
  apple: boolean = isApplePlatform(),
): boolean {
  const want = parse(hotkey)
  const mod = apple ? event.metaKey : event.ctrlKey
  // The other platform's modifier must be up: Ctrl+S on a Mac is not ⌘S.
  const other = apple ? event.ctrlKey : event.metaKey
  // A bare character ("/") is matched on the character itself: some layouts need Shift
  // (or AltGr) to type it.
  const bareChar =
    !want.mod && !want.shift && !want.alt && want.key.length === 1
  return (
    event.key.toLowerCase() === want.key &&
    mod === want.mod &&
    !other &&
    (bareChar || (event.shiftKey === want.shift && event.altKey === want.alt))
  )
}

/** "⌘ S" / "Ctrl S", for tooltips and <Kbd>. */
export function formatHotkey(
  hotkey: string,
  apple: boolean = isApplePlatform(),
): string {
  const { key, mod, shift, alt } = parse(hotkey)
  const parts: Array<string> = []
  if (mod) parts.push(apple ? '⌘' : 'Ctrl')
  if (alt) parts.push(apple ? '⌥' : 'Alt')
  if (shift) parts.push(apple ? '⇧' : 'Shift')
  parts.push(key.length === 1 ? key.toUpperCase() : key)
  return parts.join(' ')
}

/** aria-keyshortcuts value, e.g. "Meta+S" / "Control+S". */
export function ariaHotkey(
  hotkey: string,
  apple: boolean = isApplePlatform(),
): string {
  const { key, mod, shift, alt } = parse(hotkey)
  const parts: Array<string> = []
  if (mod) parts.push(apple ? 'Meta' : 'Control')
  if (alt) parts.push('Alt')
  if (shift) parts.push('Shift')
  parts.push(key.length === 1 ? key.toUpperCase() : key)
  return parts.join('+')
}

const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'radio',
  'submit',
  'reset',
  'file',
  'range',
  'color',
])

/** Focus is in something that takes typing: shortcuts without a modifier must not fire. */
export function isTypingTarget(el: EventTarget | null): boolean {
  // Duck-typed (no instanceof HTMLElement): elements from other frames, and plain tests.
  if (!el || !('tagName' in el)) return false
  const node = el as {
    tagName: string
    isContentEditable?: boolean
    type?: string
  }
  if (node.isContentEditable) return true
  if (node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') return true
  return node.tagName === 'INPUT' && !NON_TEXT_INPUTS.has(node.type ?? 'text')
}
