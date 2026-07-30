import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  error: Error | null;
}

// Prevents an error thrown while rendering one page/dialog (a malformed
// task, a null field, etc.) from unmounting the entire app to a blank
// screen -- isolates the failure to whatever this boundary wraps.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-[32px] flex flex-col items-center justify-center text-center gap-[12px]">
          <AlertTriangle className="w-[32px] h-[32px] text-destructive" />
          <p className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
            Something went wrong{this.props.fallbackLabel ? ` loading ${this.props.fallbackLabel}` : ""}.
          </p>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground max-w-[480px]">
            {this.state.error.message}
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
