import * as React from 'react'

import { Icons } from '#/components/app/icons'
import { Button } from '#/components/ui/button'

type Props = {
  children: React.ReactNode
  /** What failed, e.g. "Không vẽ được phần xem trước." */
  message: string
  /** When it changes (new params), the boundary tries its children again. */
  resetKey?: unknown
  className?: string
}

type State = { error: unknown; key: unknown }

/**
 * Error boundary for one pane of the editor: a drawing bug replaces only that pane, the
 * form stays usable. Retries by itself on the next `resetKey`, or with "Thử lại".
 */
export class PaneBoundary extends React.Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey }
  /** `display: contents`, so it adds no box around the pane; only used to find focus targets. */
  private root = React.createRef<HTMLDivElement>()

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(
    props: Props,
    state: State,
  ): Partial<State> | null {
    return Object.is(props.resetKey, state.key)
      ? null
      : { error: null, key: props.resetKey }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error(error, info.componentStack)
  }

  componentDidUpdate(_props: Props, prev: State) {
    // Focus inside the pane was removed with it (or with the retry button): never leave
    // it on <body>.
    if (document.activeElement !== document.body) return
    if (!prev.error && this.state.error) {
      this.root.current?.querySelector<HTMLElement>('button')?.focus()
    } else if (prev.error && !this.state.error) {
      this.root.current
        ?.querySelector<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        )
        ?.focus()
    }
  }

  render() {
    return (
      <div ref={this.root} className="contents">
        {this.state.error ? this.fallback() : this.props.children}
      </div>
    )
  }

  private fallback() {
    return (
      <div
        role="alert"
        className={
          this.props.className ??
          'grid content-start justify-items-start gap-3 p-5'
        }
      >
        <p className="flex items-center gap-2 text-(--color-danger)">
          <Icons.warning className="size-5 shrink-0" aria-hidden="true" />
          {this.props.message}
        </p>
        <Button
          variant="outline"
          onClick={() => this.setState({ error: null })}
        >
          <Icons.restore aria-hidden="true" />
          Thử lại
        </Button>
      </div>
    )
  }
}
