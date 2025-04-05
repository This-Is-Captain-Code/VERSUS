import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={Home} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="cyber-grid min-h-screen flex flex-col items-center py-8 px-4">
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black to-background/90 opacity-80" />
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
