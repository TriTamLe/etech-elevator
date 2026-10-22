import * as React from 'react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '#/components/ui/command'

export type AppCommand = {
  id: string
  label: string
  group: string
  /** Extra words cmdk matches against (e.g. unaccented spellings). */
  keywords?: Array<string>
  shortcut?: string
  run: () => void
}

type PaletteContext = {
  open: boolean
  setOpen: (open: boolean) => void
  register: (commands: Array<AppCommand>) => () => void
}

const Ctx = React.createContext<PaletteContext | null>(null)

function usePalette() {
  const ctx = React.useContext(Ctx)
  if (!ctx)
    throw new Error('usePalette must be used inside <CommandPaletteProvider>')
  return ctx
}

/** Open / close the palette from anywhere (e.g. the ⌘K pill in the top bar). */
export function useCommandPalette() {
  const { open, setOpen } = usePalette()
  return { open, setOpen }
}

/**
 * Register commands for as long as the calling component is mounted.
 * Pages call this (P3 adds "Tạo dự án", P4 adds "Lưu phiên bản", …).
 */
export function useRegisterCommands(commands: Array<AppCommand>) {
  const { register } = usePalette()
  const latest = React.useRef(commands)
  latest.current = commands
  // Re-register only when the visible command set changes, so callers may pass inline arrays.
  const signature = commands
    .map((c) => `${c.id}\u0000${c.label}\u0000${c.group}`)
    .join('\u0001')
  React.useEffect(
    () =>
      register(
        latest.current.map((c) => ({
          ...c,
          run: () => latest.current.find((x) => x.id === c.id)?.run(),
        })),
      ),
    [register, signature],
  )
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [sources, setSources] = React.useState<Array<Array<AppCommand>>>([])

  const register = React.useCallback((commands: Array<AppCommand>) => {
    setSources((prev) => [...prev, commands])
    return () => setSources((prev) => prev.filter((c) => c !== commands))
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip IME composition (Telex/VNI) and autofill keydowns that carry no `key`.
      if (e.isComposing || e.repeat) return
      if (
        typeof e.key === 'string' &&
        e.key.toLowerCase() === 'k' &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const groups = React.useMemo(() => {
    const byGroup = new Map<string, Array<AppCommand>>()
    for (const cmd of sources.flat()) {
      byGroup.set(cmd.group, [...(byGroup.get(cmd.group) ?? []), cmd])
    }
    return [...byGroup.entries()]
  }, [sources])

  const value = React.useMemo(
    () => ({ open, setOpen, register }),
    [open, register],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Bảng lệnh"
        description="Tìm và chạy một lệnh"
        showCloseButton={false}
        className="top-[14vh] translate-y-0 sm:max-w-140"
      >
        <CommandInput placeholder="Tìm lệnh hoặc dự án…" />
        <CommandList>
          <CommandEmpty>Không có lệnh nào khớp.</CommandEmpty>
          {groups.map(([group, commands]) => (
            <CommandGroup key={group} heading={group}>
              {commands.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.label} ${cmd.keywords?.join(' ') ?? ''}`}
                  onSelect={() => {
                    setOpen(false)
                    cmd.run()
                  }}
                >
                  {cmd.label}
                  {cmd.shortcut && (
                    <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </Ctx.Provider>
  )
}
