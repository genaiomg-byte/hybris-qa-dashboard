import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import NewRun from '@/pages/NewRun';
import RunHistory from '@/pages/RunHistory';
import RunDetail from '@/pages/RunDetail';
import Compare from '@/pages/Compare';
import TestCases from '@/pages/TestCases';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (!session) return null; // AuthProvider handles redirect
  
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/login" component={Login} />
        
        <Route path="/">
          <ProtectedRoute component={Dashboard} />
        </Route>
        
        <Route path="/runs/new">
          <ProtectedRoute component={NewRun} />
        </Route>
        
        <Route path="/runs">
          <ProtectedRoute component={RunHistory} />
        </Route>
        
        <Route path="/runs/:id">
          <ProtectedRoute component={RunDetail} />
        </Route>

        <Route path="/compare">
          <ProtectedRoute component={Compare} />
        </Route>

        <Route path="/test-cases">
          <ProtectedRoute component={TestCases} />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
