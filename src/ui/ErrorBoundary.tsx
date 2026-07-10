import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

/* ================================================================
   ERROR BOUNDARY — when the forge itself breaks, die with dignity.
   The save in localStorage is untouched; a reload rests at the
   bonfire and restores everything.
   ================================================================ */

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Emberforge] the forge has perished:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="death-banner w-full max-w-md">YOU DIED</div>
          <p className="text-bone-dim italic mt-6 max-w-sm leading-relaxed">
            Something within the forge has broken — but thy souls, records, and
            deeds are untouched. Rest at the bonfire and rise again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-ember mt-8 min-h-12 px-8"
          >
            Rest at Bonfire
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
