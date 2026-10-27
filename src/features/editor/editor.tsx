import * as React from 'react'
import { useStore } from '@tanstack/react-form'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { DerivedPanel } from '#/features/editor/derived-panel'
import {
  EditorProvider,
  HEADER_IDS,
  focusLater,
  useProjectForm,
} from '#/features/editor/editor-context'
import { EditorHeader } from '#/features/editor/editor-header'
import { collectIssues, sectionOf } from '#/features/editor/issues'
import { SheetPreview, useLastValid } from '#/features/editor/sheet-preview'
import { SectionFloors } from '#/features/editor/section-floors'
import { SectionProject } from '#/features/editor/section-project'
import { SectionResponsibility } from '#/features/editor/section-responsibility'
import { SectionRevisions } from '#/features/editor/section-revisions'
import { SectionStructure } from '#/features/editor/section-structure'
import { SectionTech } from '#/features/editor/section-tech'
import { SectionTopRoom } from '#/features/editor/section-top-room'
import { useAutosave } from '#/features/editor/use-autosave'
import { VersionsSheet } from '#/features/editor/versions-sheet'
import type { ElevatorParams } from '#/domain/schema'
import { Icons } from '#/components/app/icons'
import { cn } from '#/lib/utils'
import type { ProjectDetail } from '#/server/project-repo'

const SECTIONS = [
  ['project', 'A', 'Thông tin hồ sơ', SectionProject],
  ['tech', 'B', 'Đặc tính kỹ thuật', SectionTech],
  ['structure', 'C', 'Kết cấu hố & cửa tầng', SectionStructure],
  ['floors', 'D', 'Danh sách tầng', SectionFloors],
  ['topRoom', 'E', 'Buồng trên cùng / phòng máy', SectionTopRoom],
  ['responsibility', 'F', 'Hạng mục trách nhiệm', SectionResponsibility],
  // Part of the title block, kept apart because it is a growing list: no letter, an icon.
  ['revisions', null, 'Lịch sử hiệu chỉnh', SectionRevisions],
] as const

const DEFAULT_OPEN = ['project', 'tech']

/** Open accordion sections, remembered per project in this browser (a convenience only). */
function useOpenSections(projectId: string) {
  const key = `editor-open:${projectId}`
  const [open, setOpen] = React.useState<Array<string>>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as Array<string>) : DEFAULT_OPEN
    } catch {
      return DEFAULT_OPEN
    }
  })
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(open))
    } catch {
      // Private mode / blocked storage: the default layout is fine.
    }
  }, [key, open])
  return [open, setOpen] as const
}

function useIsDesktop() {
  const query = '(min-width: 1024px)'
  const [match, setMatch] = React.useState(
    () => window.matchMedia(query).matches,
  )
  React.useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatch(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return match
}

/** Workbench: header · form (420 px) | preview light box. Tabs below 1024 px. */
export function Editor({ project }: { project: ProjectDetail }) {
  // Frozen: later cache updates (after each save) must not re-seed the form.
  const [{ initial, savedAt }] = React.useState({
    initial: project.params,
    savedAt: project.updatedAt,
  })
  // useForm re-applies `defaultValues` whenever they differ from the form's own (and the form
  // is untouched — which form.reset makes true), so a replacement must move them too or the
  // next render puts the old values back.
  const [defaults, setDefaults] = React.useState(initial)
  const form = useProjectForm(defaults)
  const replaceParams = (params: ElevatorParams) => {
    setDefaults(params)
    form.reset(params)
  }
  const values = useStore(form.store, (s) => s.values)
  const issues = React.useMemo(() => collectIssues(values), [values])
  const autosave = useAutosave(project.id, issues, initial, savedAt)
  // Kept here, not in the preview: the preview unmounts with its tab on narrow screens.
  const lastValid = useLastValid(issues.params)
  const [open, setOpen] = useOpenSections(project.id)
  const [tab, setTab] = React.useState('form')
  const [versionsOpen, setVersionsOpen] = React.useState(false)
  const isDesktop = useIsDesktop()

  const countBySection = React.useMemo(() => {
    const counts = new Map<string, { errors: number; warnings: number }>()
    for (const i of issues.list) {
      const s = sectionOf(i.path)
      const c = counts.get(s) ?? { errors: 0, warnings: 0 }
      if (i.level === 'error') c.errors += 1
      else c.warnings += 1
      counts.set(s, c)
    }
    return counts
  }, [issues])

  const formPane = (
    // minmax(0,1fr): a long title or select value must not widen the column past the pane.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-3 sm:p-5">
      <Accordion
        type="multiple"
        value={open}
        onValueChange={setOpen}
        className="grid grid-cols-[minmax(0,1fr)] gap-3"
      >
        {SECTIONS.map(([key, letter, title, Section]) => {
          const c = countBySection.get(key)
          return (
            <AccordionItem
              key={key}
              value={key}
              // A bordered card. No overflow-hidden here: the header is sticky within the
              // card while its fields scroll past (cards are the sticky scope).
              className={cn(
                'rounded-(--radius-card) border border-(--color-rule) bg-(--color-paper) last:border-b',
                // Paper behind the header hides fields at its rounded corners while stuck.
                '[&>[data-slot=accordion-header]]:sticky [&>[data-slot=accordion-header]]:top-0 [&>[data-slot=accordion-header]]:z-10 [&>[data-slot=accordion-header]]:rounded-t-(--radius-card) [&>[data-slot=accordion-header]]:bg-(--color-paper)',
              )}
            >
              <AccordionTrigger
                level={2}
                className={cn(
                  // Inset focus ring: a stuck header sits at the scroll edge, which clips outside rings.
                  'focus-visible:-outline-offset-2',
                  'items-center rounded-(--radius-card) bg-(--color-paper-2) px-4 py-3 text-(length:--text-base) font-semibold text-(--color-ink)',
                  // Opaque on hover: the header is sticky, a translucent fill shows the fields behind it.
                  'hover:bg-[color-mix(in_oklch,var(--color-paper-2),var(--color-rule))] data-[state=open]:rounded-b-none data-[state=open]:border-b data-[state=open]:border-(--color-rule)',
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid size-6 shrink-0 place-items-center rounded-(--radius-control) border border-(--color-rule-2) bg-(--color-paper) label-mono text-(--color-ink-2)"
                  >
                    {letter ?? <Icons.versions className="size-4" />}
                  </span>
                  <span className="min-w-0 truncate">
                    {/* Hints say "mục B": screen readers need the letter too. */}
                    {letter && <span className="sr-only">{letter}. </span>}
                    {title}
                  </span>
                  {c && c.errors > 0 && (
                    <span className="label-mono rounded-full bg-(--color-danger-soft) px-2 text-(--color-danger)">
                      {c.errors}
                      <span className="sr-only"> lỗi</span>
                    </span>
                  )}
                  {c && c.warnings > 0 && (
                    <span className="label-mono rounded-full bg-(--color-paper-2) px-2 text-(--color-ink-2) ring-1 ring-(--color-warn)">
                      {c.warnings}
                      <span className="sr-only"> cảnh báo</span>
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              {/* px keeps the 2 px focus outline clear of the content's overflow clip. */}
              <AccordionContent className="px-3 pt-4 pb-2 sm:px-4">
                <Section />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      <DerivedPanel />
    </div>
  )

  return (
    <EditorProvider value={{ form, issues, replaceParams }}>
      <div className="flex h-dvh flex-col">
        <EditorHeader
          name={values.project.name}
          save={autosave.state}
          onOpenVersions={() => setVersionsOpen(true)}
        />
        {isDesktop ? (
          <div className="grid min-h-0 flex-1 grid-cols-[420px_minmax(0,1fr)]">
            <aside
              aria-label="Thông số"
              // scroll-pt: focused fields scroll clear of the sticky group header.
              className="min-h-0 scroll-pt-16 overflow-y-auto border-r border-(--color-rule)"
            >
              {formPane}
            </aside>
            <section aria-label="Xem trước" className="min-h-0 overflow-hidden">
              <SheetPreview params={lastValid} stale={!issues.params} />
            </section>
          </div>
        ) : (
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <TabsList className="mx-4 my-2 w-auto self-stretch sm:mx-5">
              <TabsTrigger value="form">Thông số</TabsTrigger>
              <TabsTrigger value="preview">Xem trước</TabsTrigger>
            </TabsList>
            <TabsContent
              value="form"
              className="min-h-0 flex-1 scroll-pt-16 overflow-y-auto"
            >
              {formPane}
            </TabsContent>
            <TabsContent
              value="preview"
              className="min-h-0 flex-1 overflow-hidden"
            >
              <SheetPreview params={lastValid} stale={!issues.params} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <VersionsSheet
        projectId={project.id}
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        flush={autosave.flush}
      />

      <AlertDialog
        open={autosave.blocker.status === 'blocked'}
        onOpenChange={(o) => !o && autosave.blocker.reset?.()}
      >
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            focusLater(HEADER_IDS.back)
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Rời trang khi chưa lưu?</AlertDialogTitle>
            <AlertDialogDescription>
              {issues.params
                ? 'Chưa lưu được thay đổi mới nhất. Nếu rời trang, thay đổi đó sẽ mất.'
                : `Form còn ${issues.errors} lỗi nên chưa lưu được. Nếu rời trang, các thay đổi từ lần lưu trước sẽ mất.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => autosave.blocker.reset?.()}>
              Ở lại
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => autosave.blocker.proceed?.()}>
              Rời trang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EditorProvider>
  )
}
