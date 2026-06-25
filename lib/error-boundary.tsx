"use client";

import { AlertCircle } from "lucide-react";
import { Component } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  reload?: boolean;
}

interface State {
  error: Error | null;
  hasError: boolean;
}

// biome-ignore lint/style/useReactFunctionComponents: Error boundaries require class components
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    if (this.props.fallback) {
      return this.props.fallback;
    }
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <h2 className="mb-1 font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="mb-4 text-muted-foreground text-sm">
            {this.state.error?.message ?? "Try refreshing the page."}
          </p>
          <Button
            onClick={
              this.props.reload
                ? () => window.location.reload()
                : () => this.setState({ hasError: false, error: null })
            }
            size="sm"
            variant="outline"
          >
            {this.props.reload ? "Reload" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }
}
