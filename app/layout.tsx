import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Smart CNC Manager",description:"Gestione professionale del reparto CNC"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="it"><body>{children}</body></html>}
