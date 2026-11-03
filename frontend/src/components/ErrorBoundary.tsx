import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 text-center soft-card border-[#F7C8C8] bg-[#FDF2F2]/40 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-[#FDF2F2] border border-[#F7C8C8] flex items-center justify-center text-[#C84040] mx-auto shadow-xs">
            <AlertOctagon className="h-6 w-6 text-[#C84040]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#172820]">
              Component Rendering Exception
            </h3>
            <p className="text-xs text-[#68776F] mt-1">
              {this.props.fallbackMessage ||
                "An unexpected rendering error occurred in this view. Other subsystems remain operational."}
            </p>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-white border border-[#E3EAE5] text-[11px] font-mono text-[#C84040] text-left max-h-32 overflow-y-auto">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#247653] hover:bg-[#174D39] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry &amp; Reload View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
