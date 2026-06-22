"use client";

import { Component } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

// biome-ignore lint/style/useReactFunctionComponents: Error boundaries require class components
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md text-center">
            <h2 className="mb-2 font-semibold text-foreground text-lg">
              Editor crashed
            </h2>
            <p className="mb-4 text-muted-foreground text-sm">
              {this.state.error?.message ?? "Something went wrong"}
            </p>
            <button
              className="rounded bg-primary px-4 py-2 text-primary-foreground text-sm"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              type="button"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
