import type { z } from 'zod'

import { checkRules } from '#/domain/rules'
import type { Issue } from '#/domain/rules'
import { ElevatorParams } from '#/domain/schema'

// Every problem the editor shows, from two sources merged by dotted path:
// Zod (shape: blank, negative, wrong type) and checkRules (cross-field, error | warning).
// Cross-field rules only run once the shape is valid, since they read real numbers.

export type EditorIssues = {
  /** Valid params, or null while any Zod issue remains (then nothing is saved). */
  params: ElevatorParams | null
  list: Array<Issue>
  byPath: ReadonlyMap<string, Array<Issue>>
  errors: number
  warnings: number
}

/** Short Vietnamese messages instead of Zod's English defaults. */
const viError: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      return issue.expected === 'number'
        ? 'Nhập một số.'
        : 'Giá trị không hợp lệ.'
    case 'too_small':
      if (issue.origin === 'string') return 'Không được để trống.'
      if (issue.origin === 'array')
        return `Cần ít nhất ${String(issue.minimum)} dòng.`
      return issue.minimum === 0 && !issue.inclusive
        ? 'Phải lớn hơn 0.'
        : `Tối thiểu ${String(issue.minimum)}.`
    case 'not_multiple_of':
      return 'Nhập số nguyên.'
    case 'invalid_value':
      return 'Chọn một giá trị trong danh sách.'
    default:
      return 'Giá trị không hợp lệ.'
  }
}

/** Zod path ["floors", 2, "height"] → "floors.2.height" (the same key Field ids use). */
export function pathKey(path: ReadonlyArray<PropertyKey>): string {
  return path.map(String).join('.')
}

/** TanStack Form name "floors[2].height" → "floors.2.height". */
export function fieldKey(name: string): string {
  return name.replace(/\[(\d+)\]/g, '.$1')
}

export function collectIssues(values: unknown): EditorIssues {
  const parsed = ElevatorParams.safeParse(values, { error: viError })
  const list: Array<Issue> = parsed.success
    ? checkRules(parsed.data)
    : parsed.error.issues.map((i) => ({
        level: 'error' as const,
        path: pathKey(i.path),
        message: i.message,
      }))
  const byPath = new Map<string, Array<Issue>>()
  for (const issue of list) {
    const bucket = byPath.get(issue.path)
    if (bucket) bucket.push(issue)
    else byPath.set(issue.path, [issue])
  }
  const errors = list.filter((i) => i.level === 'error').length
  return {
    params: parsed.success ? parsed.data : null,
    list,
    byPath,
    errors,
    warnings: list.length - errors,
  }
}

/** Accordion section that owns a path (per-section issue badges). */
export function sectionOf(path: string): string {
  const root = path.split('.')[0]
  return root === 'schemaVersion' ? 'project' : root
}
