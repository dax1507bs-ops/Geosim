import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SelectGame from "./pages/SelectGame";
import GameDashboard from "./pages/GameDashboard";
import GameSessions from "./pages/GameSessions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sessions" component={GameSessions} />
      <Route path="/select" component={SelectGame} />
      <Route path="/game/:sessionId" component={GameDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: 'oklch(0.14 0.018 240)',
                border: '1px solid oklch(0.22 0.020 240)',
                color: 'oklch(0.92 0.012 220)',
              }
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
