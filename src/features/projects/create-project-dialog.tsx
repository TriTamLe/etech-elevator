import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { PROJECT_TEXT_MAX } from '#/domain/config'
import { PRESETS } from '#/domain/presets'
import type { PresetId } from '#/domain/presets'
import { errorMessage, useCreateProject } from '#/features/projects/queries'
import { useNetworkGate } from '#/lib/use-network-gate'
import { cn } from '#/lib/utils'

const presetName = (id: PresetId) =>
  PRESETS.find((p) => p.id === id)?.params.project.name ?? ''

/** `labelled`: the trigger shows its text at every width (empty state). */
export function CreateProjectDialog({
  labelled = false,
}: {
  labelled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const { hydrated, offline } = useNetworkGate()
  const [presetId, setPresetId] = React.useState<PresetId>(PRESETS[0].id)
  const [name, setName] = React.useState(presetName(PRESETS[0].id))
  // The name follows the preset until the user types their own.
  const [nameTouched, setNameTouched] = React.useState(false)
  // Starts empty: the presets' addresses are placeholders, not real sites.
  const [address, setAddress] = React.useState('')
  const create = useCreateProject()
  const navigate = useNavigate()

  const reset = () => {
    setPresetId(PRESETS[0].id)
    setName(presetName(PRESETS[0].id))
    setNameTouched(false)
    setAddress('')
    create.reset()
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // Offline the request would pause and the button spin until the network returns.
    if (!name.trim() || offline) return
    create.mutate(
      { kind: 'preset', presetId, name: name.trim(), address: address.trim() },
      {
        onSuccess: (project) => {
          setOpen(false)
          void navigate({ to: '/projects/$id', params: { id: project.id } })
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && offline) return
        setOpen(next)
        if (!next) reset()
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              disabled={!hydrated}
              aria-disabled={offline !== null || undefined}
              aria-label={offline ? `Tạo dự án — ${offline}` : 'Tạo dự án'}
              className="shrink-0"
            >
              <Icons.create aria-hidden="true" />
              <span className={cn(!labelled && 'hidden sm:inline')}>
                Tạo dự án
              </span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        {/* Icon-only below 640 px: the tooltip names it; offline it gives the reason. */}
        <TooltipContent
          className={cn(!offline && (labelled ? 'hidden' : 'sm:hidden'))}
        >
          {offline ? `Tạo dự án · ${offline}` : 'Tạo dự án'}
        </TooltipContent>
      </Tooltip>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Tạo dự án</DialogTitle>
            <DialogDescription>
              Chọn bộ mẫu để điền sẵn thông số, sau đó sửa trong màn soạn.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2">
            <legend className="mb-2 label-mono text-(--color-ink-3)">
              Bộ mẫu
            </legend>
            <RadioGroup
              value={presetId}
              onValueChange={(value) => {
                const id = value as PresetId
                setPresetId(id)
                if (!nameTouched) setName(presetName(id))
              }}
              className="grid gap-2"
            >
              {PRESETS.map((preset) => (
                <label
                  key={preset.id}
                  className="flex items-start gap-3 rounded-(--radius-control) border border-(--color-rule-2) p-3 hover:bg-(--color-paper-2) has-data-[state=checked]:border-(--color-accent) has-data-[state=checked]:bg-(--color-accent-soft)"
                >
                  <RadioGroupItem value={preset.id} className="mt-0.5" />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="font-medium text-(--color-ink)">
                      {preset.label}
                    </span>
                    <span className="font-mono text-(length:--text-xs) text-(--color-ink-3)">
                      {preset.description}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>

          <Field
            label="Tên công trình"
            required
            error={
              create.error
                ? errorMessage(create.error)
                : name.trim()
                  ? undefined
                  : 'Tên không được để trống.'
            }
          >
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameTouched(true)
              }}
              maxLength={PROJECT_TEXT_MAX.name}
            />
          </Field>

          <Field label="Địa chỉ" hint="Ví dụ: 12 Lê Lợi, Hải Châu, Đà Nẵng">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={PROJECT_TEXT_MAX.address}
            />
          </Field>

          <DialogFooter>
            {offline && (
              <p className="self-center text-(length:--text-sm) text-(--color-ink-3)">
                {offline} để tạo dự án.
              </p>
            )}
            <Button
              type="submit"
              loading={create.isPending}
              disabled={!name.trim()}
              aria-disabled={offline !== null || undefined}
            >
              Tạo dự án
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
