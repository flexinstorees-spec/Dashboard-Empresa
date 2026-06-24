import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Overview from "@/pages/overview";
import Performance from "@/pages/performance";
import Offers from "@/pages/offers";
import OfferDetail from "@/pages/offer-detail";
import Comparison from "@/pages/comparison";
import Cashflow from "@/pages/cashflow";
import Login from "@/pages/login";
import Settings from "@/pages/settings";
import Campaigns from "@/pages/campaigns";
import { setBaseUrl } from "@workspace/api-client-react";
import { API_ROOT_URL } from "@/lib/api";

// Only configure setBaseUrl for external deployments (Netlify → Railway/Render).
// The generated client already uses /api/* paths, so setBaseUrl receives the
// root URL only (no /api suffix). On Replit, relative paths work automatically.
if (API_ROOT_URL) {
  setBaseUrl(API_ROOT_URL);
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/desempenho" component={Performance} />
      <Route path="/ofertas" component={Offers} />
      <Route path="/ofertas/:id" component={OfferDetail} />
      <Route path="/comparacao" component={Comparison} />
      <Route path="/fluxo-de-caixa" component={Cashflow} />
      <Route path="/campanhas" component={Campaigns} />
      <Route path="/login" component={Login} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
