import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <a href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: "Attendance Management — HRMS & Payroll for India" },
      { name: "description", content: "Indian HRMS, attendance tracking, leave management and automated payroll with monthly payslips in INR." },
      { name: "theme-color", content: "#5B5BD6" },
      { property: "og:title", content: "Attendance Management — HRMS & Payroll for India" },
      { name: "twitter:title", content: "Attendance Management — HRMS & Payroll for India" },
      { property: "og:description", content: "Indian HRMS, attendance tracking, leave management and automated payroll with monthly payslips in INR." },
      { name: "twitter:description", content: "Indian HRMS, attendance tracking, leave management and automated payroll with monthly payslips in INR." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cc03f2a0-1cac-4190-9c0d-e6b4372ba87f/id-preview-308ef6d8--53075410-a894-47ed-b3d0-a9b4a04285fd.lovable.app-1777614937459.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cc03f2a0-1cac-4190-9c0d-e6b4372ba87f/id-preview-308ef6d8--53075410-a894-47ed-b3d0-a9b4a04285fd.lovable.app-1777614937459.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
