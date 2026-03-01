import * as React from "react";
import { logError } from "../lib/errorHandler";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError("ErrorBoundary", error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <p className="text-foreground text-center mb-4">
            Something broke on this page. Your data is safe. Refresh to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
