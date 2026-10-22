import * as React from 'react'

import { fieldSurface } from '#/components/ui/input'
import { cn } from '#/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldSurface, 'min-h-24 resize-y px-3 py-2 pr-9', className)}
      {...props}
    />
  )
}

export { Textarea }
