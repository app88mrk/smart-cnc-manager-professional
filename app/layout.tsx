import type { Metadata } from "next";
import PwaManager from "@/components/common/PwaManager";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart CNC Manager Professional",
  description: "Gestione professionale del parco macchine CNC",
  manifest: "/manifest.webmanifest",
  themeColor: "#0d3f77",
  icons: {
    icon: "/smart-cnc-icon.svg",
    apple: "/smart-cnc-icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}<PwaManager /></body></html>;
}
