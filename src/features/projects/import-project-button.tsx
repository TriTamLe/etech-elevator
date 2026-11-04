import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { readJsonFile } from '#/features/projects/project-json'
import { errorMessage, useCreateProject } from '#/features/projects/queries'
import { useNetworkGate } from '#/lib/use-network-gate'

// Picks a .json export, sends it to createProject (the server runs migrate()), opens it.
/** `labelled`: an outline button with its text (empty state) instead of the icon button. */
export function ImportProjectButton({
  labelled = false,
}: {
  labelled?: boolean
}) {
  const input = React.useRef<HTMLInputElement>(null)
  const { hydrated, offline } = useNetworkGate()
  const create = useCreateProject()
  const navigate = useNavigate()

  const onFile = async (file: File) => {
    try {
      const params = await readJsonFile(file)
      const project = await create.mutateAsync({ kind: 'import', params })
      toast.success(`Đã nhập “${project.name}”.`)
      void navigate({ to: '/projects/$id', params: { id: project.id } })
    } catch (e) {
      toast.error(`Không nhập được: ${errorMessage(e)}`)
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void onFile(file)
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={labelled ? 'default' : 'icon'}
            aria-label={
              offline
                ? `Nhập dự án từ file JSON — ${offline}`
                : 'Nhập dự án từ file JSON'
            }
            disabled={!hydrated}
            aria-disabled={offline !== null || create.isPending || undefined}
            loading={create.isPending}
            onClick={() => !offline && input.current?.click()}
            className="shrink-0"
          >
            <Icons.importJson aria-hidden="true" />
            {labelled && 'Nhập JSON'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {offline ? `Nhập JSON · ${offline}` : 'Nhập JSON'}
        </TooltipContent>
      </Tooltip>
    </>
  )
}
