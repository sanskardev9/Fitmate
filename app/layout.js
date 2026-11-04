import "./globals.css";
import ServiceWorkerRegister from "@/components/common/ServiceWorkerRegister";
import PullToRefresh from "@/components/common/PullToRefresh";
import MiniPlayer from "@/components/music/MiniPlayer";
import Toaster from "@/components/common/Toaster";
import MusicPicker from "@/components/music/MusicPicker";
import Splash from "@/components/common/Splash";
import { AuthProvider } from "@/components/auth/AuthProvider";
import SyncProvider from "@/components/sync/SyncProvider";
import { ConfirmProvider } from "@/components/common/ConfirmDialog";

export const metadata = {
  title: { default: "FitMate", template: "%s · FitMate" },
  description: "Your Fitness. Your Nutrition. Your Progress.",
  appleWebApp: { capable: true, title: "FitMate", statusBarStyle: "default" },
  // iPhone Home Screen needs a PNG (it ignores SVG).
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
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
            __html: `(function(){try{var c=localStorage.getItem("fitmate:theme")||"system";var d=c==="dark"||(c==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";var m=matchMedia("(prefers-color-scheme: dark)");m.addEventListener("change",function(e){if((localStorage.getItem("fitmate:theme")||"system")!=="system")return;document.documentElement.classList.toggle("dark",e.matches);document.documentElement.style.colorScheme=e.matches?"dark":"light";window.dispatchEvent(new Event("fitmate:theme"));});}catch(e){}})();`,
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
        <PullToRefresh />
        <MiniPlayer />
        <Toaster />
        <MusicPicker />
      </body>
    </html>
  );
}
