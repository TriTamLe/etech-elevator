import * as React from 'react'
import { useForm } from '@tanstack/react-form'

import type { ElevatorParams } from '#/domain/schema'
import type { EditorIssues } from '#/features/editor/issues'

// The form is TanStack Form used as the value store; validation is collectIssues()
// (Zod shape + checkRules), computed once per change and shared through context.

export function useProjectForm(params: ElevatorParams) {
  return useForm({ defaultValues: params })
}

export type ProjectForm = ReturnType<typeof useProjectForm>

type EditorContextValue = {
  form: ProjectForm
  issues: EditorIssues
  /** Replace every value (restore a version, import JSON). Use this, not form.reset. */
  replaceParams: (params: ElevatorParams) => void
}

const EditorContext = React.createContext<EditorContextValue | null>(null)

export function EditorProvider({
  value,
  children,
}: {
  value: EditorContextValue
  children: React.ReactNode
}) {
  return <EditorContext value={value}>{children}</EditorContext>
}

export function useEditor(): EditorContextValue {
  const ctx = React.use(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>')
  return ctx
}

/** DOM id of the control for a dotted path (focus targets, aria wiring). */
export function fieldId(key: string): string {
  return `field-${key}`
}

/** Ids of header controls that dialogs return focus to (they open dialogs by state, not Trigger). */
export const HEADER_IDS = {
  back: 'editor-back',
  versions: 'editor-versions',
  importJson: 'editor-import',
} as const

/**
 * Focus an element once React and Radix have finished closing things. Radix only returns
 * focus to a Trigger; dialogs opened from state use this in onCloseAutoFocus.
 */
export function focusLater(id: string, fallbackId?: string): void {
  requestAnimationFrame(() => {
    const usable = (x: string | undefined) => {
      const el = x ? document.getElementById(x) : null
      // A disabled control (e.g. "Bớt tầng" at the minimum) would drop focus to body.
      return el && !el.matches(':disabled') ? el : null
    }
    ;(usable(id) ?? usable(fallbackId))?.focus()
  })
}
