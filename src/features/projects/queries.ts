import {
  queryOptions,
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { isNotFound } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { PresetId } from '#/domain/presets'
import type { ElevatorParams } from '#/domain/schema'
import {
  createProject,
  deleteProject,
  duplicateProject,
  getProject,
  getVersion,
  listProjects,
  listVersions,
  restoreProject,
  saveProject,
  saveVersion,
  updateProjectInfo,
} from '#/server/projects'
import type { ProjectListItem } from '#/server/project-repo'

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  versions: (id: string) => [...projectKeys.all, 'versions', id] as const,
}

// Fresh for 30 s: the SSR-prefetched list is not refetched again on hydrate.
const STALE_MS = 30_000

export const projectsQuery = queryOptions({
  queryKey: projectKeys.list(),
  queryFn: () => listProjects(),
  staleTime: STALE_MS,
})

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject({ data: { id } }),
    staleTime: STALE_MS,
  })

/** Every per-row mutation shares this key so the table can dim rows that are busy. */
const rowMutationKey = [...projectKeys.all, 'row'] as const

export function usePendingRowIds(): ReadonlySet<string> {
  const ids = useMutationState({
    filters: { mutationKey: rowMutationKey, status: 'pending' },
    select: (m) => (m.state.variables as { id: string } | undefined)?.id,
  })
  return new Set(ids.filter((id): id is string => Boolean(id)))
}

export function errorMessage(error: unknown): string {
  if (isNotFound(error)) return 'Dự án không còn tồn tại.'
  return error instanceof Error && error.message
    ? error.message
    : 'Đã có lỗi, vui lòng thử lại.'
}

/**
 * Refetch the list once the last row mutation settles. Refetching while another
 * optimistic edit is in flight would flash its row back in.
 */
function useInvalidateList() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.isMutating({ mutationKey: rowMutationKey }) <= 1
      ? queryClient.invalidateQueries({ queryKey: projectKeys.list() })
      : undefined
}

type CreateInput =
  | { kind: 'preset'; presetId: PresetId; name: string; address: string }
  | { kind: 'import'; params: unknown }

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInput) => createProject({ data }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
  })
}

export function useDuplicateProject() {
  const invalidate = useInvalidateList()
  return useMutation({
    mutationKey: rowMutationKey,
    mutationFn: (vars: { id: string }) => duplicateProject({ data: vars }),
    onSuccess: (copy) => toast.success(`Đã nhân bản thành “${copy.name}”.`),
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: invalidate,
  })
}

type Rows = Array<ProjectListItem>

/** Optimistic edit of one row. Rollback restores only that row, so concurrent edits survive. */
function useOptimisticRow() {
  const queryClient = useQueryClient()
  const key = projectsQuery.queryKey
  return async (id: string, edit: (rows: Rows) => Rows) => {
    await queryClient.cancelQueries({ queryKey: projectKeys.list() })
    const previous = queryClient.getQueryData(key)
    const index = previous?.findIndex((r) => r.id === id) ?? -1
    const before = index >= 0 ? previous?.[index] : undefined
    if (previous) queryClient.setQueryData(key, edit(previous))
    return {
      rollback: () => {
        if (!before) return
        queryClient.setQueryData(key, (rows: Rows | undefined) => {
          if (!rows) return rows
          if (rows.some((r) => r.id === id)) {
            return rows.map((r) => (r.id === id ? before : r))
          }
          const next = [...rows]
          next.splice(Math.min(index, next.length), 0, before)
          return next
        })
      },
    }
  }
}

export type ProjectInfo = { id: string; name: string; address: string }

export function useUpdateProjectInfo() {
  const queryClient = useQueryClient()
  const optimistic = useOptimisticRow()
  const invalidate = useInvalidateList()
  return useMutation({
    mutationKey: rowMutationKey,
    mutationFn: (vars: ProjectInfo) => updateProjectInfo({ data: vars }),
    onMutate: ({ id, name, address }) =>
      optimistic(id, (rows) =>
        rows.map((r) =>
          r.id === id
            ? { ...r, name: name.trim(), address: address.trim() }
            : r,
        ),
      ),
    onError: (error, _vars, ctx) => {
      ctx?.rollback()
      toast.error(`Không lưu được thông tin: ${errorMessage(error)}`)
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) })
      return invalidate()
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const optimistic = useOptimisticRow()
  const invalidate = useInvalidateList()
  const restore = useRestoreProject()
  return useMutation({
    mutationKey: rowMutationKey,
    mutationFn: (vars: { id: string; name: string }) =>
      deleteProject({ data: { id: vars.id } }),
    onMutate: ({ id }) =>
      optimistic(id, (rows) => rows.filter((r) => r.id !== id)),
    onSuccess: (_data, { id, name }) => {
      // A cached detail would let Back/Forward reopen the deleted project.
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) })
      toast(`Đã xóa “${name}”.`, {
        duration: 6000,
        action: { label: 'Hoàn tác', onClick: () => restore.mutate({ id }) },
      })
    },
    onError: (error, _vars, ctx) => {
      ctx?.rollback()
      toast.error(`Không xóa được: ${errorMessage(error)}`)
    },
    onSettled: invalidate,
  })
}

export function useRestoreProject() {
  const invalidate = useInvalidateList()
  return useMutation({
    mutationKey: rowMutationKey,
    mutationFn: (vars: { id: string }) => restoreProject({ data: vars }),
    onError: (error) => toast.error(`Không hoàn tác được: ${errorMessage(error)}`),
    onSettled: invalidate,
  })
}


export const versionsQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.versions(id),
    queryFn: () => listVersions({ data: { id } }),
  })

export function fetchVersion(projectId: string, versionId: string) {
  return getVersion({ data: { projectId, versionId } })
}

/**
 * Autosave write. One scope per project, so saves run strictly in order; on success the
 * detail cache takes the new params and the list refetches (name/address may have changed).
 */
export function useSaveProject(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    scope: { id: `save-${id}` },
    mutationFn: (params: ElevatorParams) =>
      saveProject({ data: { id, params } }),
    onSuccess: (item, params) => {
      queryClient.setQueryData(projectKeys.detail(id), (old) =>
        old ? { ...old, ...item, params } : old,
      )
      void queryClient.invalidateQueries({ queryKey: projectKeys.list() })
    },
  })
}

export function useSaveVersion(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    // Same scope as autosave: the snapshot is taken only after queued saves have landed.
    scope: { id: `save-${id}` },
    mutationFn: (note: string | null) =>
      saveVersion({ data: { id, note } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectKeys.versions(id) }),
    onError: (error) =>
      toast.error(`Không lưu được phiên bản: ${errorMessage(error)}`),
  })
}
