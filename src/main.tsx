import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/manrope";
import App from "./App";
import "./styles.css";
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>The simulator needs a fresh start.</h1>
        <p>
          Reload to return to the exhibition layout. Any downloaded layouts are
          safe.
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload CrowdFlow
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
