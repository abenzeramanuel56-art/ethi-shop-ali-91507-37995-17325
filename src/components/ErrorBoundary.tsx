import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it loudly in the console so it can be reported instead of
    // silently showing a blank/black screen.
    console.error("App crashed:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
            background: "hsl(220 20% 6%)",
            color: "#fff",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.7, maxWidth: 480 }}>
            {this.state.message}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "0.5rem",
              background: "#f97316",
              color: "#000",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
