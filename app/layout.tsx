import type { Metadata, Viewport } from "next";
import PwaManager from "@/components/common/PwaManager";
import "./globals.css";
import "./programs.css";
import "./cutting-organized.css";
import "./cutting-advanced.css";

export const metadata: Metadata = {
  title: "Smart CNC Manager Professional",
  description: "Gestione professionale del parco macchine CNC",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/smart-cnc-icon.svg",
    apple: "/smart-cnc-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d3f77",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}<PwaManager /></body></html>;
}
