import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
  // "widget" renders a small inline fallback for a non-critical piece of a
  // larger page (e.g. the AI Insights card) so the rest of that page keeps
  // working. Default "page" keeps the original full-height fallback.
  variant?: "page" | "widget";
}

interface State {
  error: Error | null;
}

// Prevents an error thrown while rendering one page/dialog/widget (a
// malformed task, a null field, a failed network call, etc.) from taking
// down everything else on screen -- isolates the failure to whatever this
// specific boundary wraps. The caught error is logged to the console (and,
// via reportClientError, to a server-side log) for troubleshooting -- never
// shown to the user verbatim, since a raw error message can include things
// like table/column names or other internals that shouldn't be user-facing.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
    import("../src/lib/errorLog").then(({ reportClientError }) =>
      reportClientError(error, { componentStack: info.componentStack, label: this.props.fallbackLabel })
    ).catch(() => {});
  }

  render() {
    if (this.state.error) {
      if (this.props.variant === "widget") {
        return (
          <div className="p-[16px] flex flex-col items-center justify-center text-center gap-[8px] bg-card border border-border rounded-[20px]">
            <AlertTriangle className="w-[20px] h-[20px] text-destructive" />
            <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
              {this.props.fallbackLabel ? `${this.props.fallbackLabel} is unavailable right now.` : "This couldn't load."}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="font-['Roboto_Mono'] text-[10px] text-accent hover:underline"
            >
              Try again
            </button>
          </div>
        );
      }
      return (
        <div className="p-[32px] flex flex-col items-center justify-center text-center gap-[12px]">
          <AlertTriangle className="w-[32px] h-[32px] text-destructive" />
          <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
            Something went wrong{this.props.fallbackLabel ? ` loading ${this.props.fallbackLabel}` : ""}.
          </p>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground max-w-[480px]">
            This has been logged. Try again, or come back to this later.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="px-[16px] py-[8px] bg-accent text-white rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] text-[11px]"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
