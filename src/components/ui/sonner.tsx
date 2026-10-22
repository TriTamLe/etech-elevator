import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'

// Light-only app: no theme provider. Toasts sit bottom-right and never shift layout.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-(--color-ok)" />,
        info: <InfoIcon className="size-4 text-(--color-accent)" />,
        warning: <TriangleAlertIcon className="size-4 text-(--color-ink)" />,
        error: <OctagonXIcon className="size-4 text-(--color-danger)" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--color-paper)',
          '--normal-text': 'var(--color-ink-2)',
          '--normal-border': 'var(--color-rule-2)',
          '--border-radius': 'var(--radius-card)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
