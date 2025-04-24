import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings, BarChart2, Home } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { MoonIcon, SunIcon } from "lucide-react";

export function AppLayout() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
    },
    {
      href: "/compare",
      icon: BarChart2,
      label: "Compare",
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link className="flex items-center space-x-2" to="/">
              <span className="font-bold">LLM Comparo</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-2 text-muted-foreground transition-colors hover:text-foreground",
                    location.pathname === item.href && "text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? (
              <MoonIcon className="h-5 w-5" />
            ) : (
              <SunIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container flex-1">
        <Outlet />
      </main>
    </div>
  );
} 