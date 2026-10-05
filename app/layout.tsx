import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Institutional OS | Decision Runtime",
  description: "Connected institutional intelligence, simulation, human governance and evidence-aware decisioning for regulated enterprises."
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
