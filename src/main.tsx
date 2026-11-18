import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LanguageProvider } from "./contexts/LanguageContext.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" themes={["dark","light"]} enableSystem={false}>
    <LanguageProvider>
      <App />
    </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
