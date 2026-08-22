import { Link, useLocation } from "wouter";
import { LayoutDashboard, Play, ListFilter, GitCompare, LogOut, TestTubeDiagonal, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut, user, canCreateRun } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ...(canCreateRun ? [{ href: "/runs/new", label: "New Run", icon: Play }] : []),
    { href: "/runs", label: "History", icon: ListFilter },
    { href: "/compare", label: "Compare", icon: GitCompare },
    { href: "/test-cases", label: "Test Cases", icon: ClipboardList },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground dark">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border flex items-center gap-3 text-primary">
          <TestTubeDiagonal className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight">Storefront.QA</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                location === item.href || (location.startsWith(item.href) && item.href !== '/')
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate">
              <span className="text-sm font-medium truncate" data-testid="user-email">{user?.email}</span>
              <span className="text-xs text-muted-foreground">QA Engineer</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} data-testid="btn-logout" title="Log out">
              <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
