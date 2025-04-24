import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import ComparisonDashboard from "./pages/ComparisonDashboard";
import Settings from "./pages/Settings";
import { Welcome } from "./pages/Welcome";

const queryClient = new QueryClient();

function App() {
  // Clear localStorage on app start to fix any corrupted state
  useEffect(() => {
    try {
      // Only clear if there's an issue with the settings
      const settings = localStorage.getItem('model-settings');
      if (settings) {
        try {
          const parsed = JSON.parse(settings);
          if (!parsed || typeof parsed !== 'object' || !parsed.ollama) {
            // Settings are invalid, clear them
            localStorage.removeItem('model-settings');
            console.log('Cleared invalid settings from localStorage');
          }
        } catch (e) {
          // JSON parse error, clear settings
          localStorage.removeItem('model-settings');
          console.log('Cleared corrupted settings from localStorage');
        }
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Welcome />} />
                  <Route path="compare" element={<ComparisonDashboard />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
