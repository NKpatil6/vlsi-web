"use client";

import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Error Boundary component - prevents module crashes from taking down the whole app.
 * Wrap around any feature that might fail (AI Explorer, Quiz, Flashcards, etc.)
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      const { fallbackLabel = "This module", onReset } = this.props;

      return (
        <div className="flex items-center justify-center min-h-64 p-8 bg-[#0f172a]">
          <div className="flex flex-col items-center justify-center w-full max-w-lg p-8 bg-[#1e293b] rounded-xl border border-red-500/30">
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              {fallbackLabel} encountered an error
            </h3>
            <p className="text-sm text-slate-400 text-center max-w-sm mb-1">
              Something went wrong loading this section. This could be a
              temporary issue.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono text-red-400 bg-red-500/10 px-3 py-2 rounded-lg mb-5 max-w-sm text-center break-all">
                {this.state.error.message || "Unknown error"}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  this.handleReset();
                  if (onReset) onReset();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => (window.location.hash = "#/dashboard")}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-[#1e293b] border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
