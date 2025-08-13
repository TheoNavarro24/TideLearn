import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Editor from "./pages/Editor";
import View from "./pages/View";
import Courses from "./pages/Courses";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import { AuthProvider } from "@/context/AuthProvider";
import Protected from "@/components/auth/Protected";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/courses"
              element={
                <Protected>
                  <Courses />
                </Protected>
              }
            />
            <Route
              path="/editor"
              element={
                <Protected>
                  <Editor />
                </Protected>
              }
            />
            <Route path="/view" element={<View />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
