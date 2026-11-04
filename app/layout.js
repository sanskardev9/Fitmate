import "./globals.css";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import Splash from "@/components/common/Splash";
import { AuthProvider } from "@/components/auth/AuthProvider";
import SyncProvider from "@/components/sync/SyncProvider";
import { ConfirmProvider } from "@/components/common/ConfirmDialog";

export const metadata = {
  title: { default: "FitMate", template: "%s · FitMate" },
  description: "Your Fitness. Your Nutrition. Your Progress.",
  appleWebApp: { capable: true, title: "FitMate", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=localStorage.getItem("fitmate:theme")||"system";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <SyncProvider>
            <ConfirmProvider>
              <Splash />
              {children}
            </ConfirmProvider>
          </SyncProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
