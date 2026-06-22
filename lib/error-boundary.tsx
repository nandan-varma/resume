"use client";

import { AlertCircle } from "lucide-react";
import { Component } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-[200px] items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <h2 className="mb-1 font-semibold text-foreground">Something went wrong</h2>
          <p className="mb-4 text-muted-foreground text-sm">Try refreshing the page.</p>
          <Button onClick={() => this.setState({ hasError: false })} size="sm" variant="outline">
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
