"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] items-center justify-center p-6">
            <div className="text-center">
              <h2 className="mb-2 font-semibold text-foreground text-lg">
                Something went wrong
              </h2>
              <p className="mb-4 text-muted-foreground text-sm">
                Try refreshing the page.
              </p>
              <button
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                onClick={() => this.setState({ hasError: false })}
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
