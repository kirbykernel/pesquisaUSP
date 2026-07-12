import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminParticipants from "./pages/admin/Participants";
import AdminContent from "./pages/admin/Content";
import AdminReports from "./pages/admin/Reports";
import AdminData from "./pages/admin/Data";
import AdminSettings from "./pages/admin/Settings";
import AdminAdmins from "./pages/admin/Admins";

// Participant pages
import ParticipantLogin from "./pages/participant/Login";
import ParticipantApp from "./pages/participant/App";

function Router() {
  return (
    <Switch>
      {/* Public home */}
      <Route path={"/"} component={Home} />
      
      {/* Participant routes */}
      <Route path={"/participant/login"} component={ParticipantLogin} />
      <Route path={"/participant/app"} component={ParticipantApp} />
      
      {/* Admin routes */}
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/participants"} component={AdminParticipants} />
      <Route path={"/admin/content"} component={AdminContent} />
      <Route path={"/admin/reports"} component={AdminReports} />
      <Route path="/admin/data" component={AdminData} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/admins" component={AdminAdmins} />
      
      {/* 404 */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
