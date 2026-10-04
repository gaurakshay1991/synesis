import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synesis | Regulatory Risk Intelligence",
  description: "Explainable contract and regulatory intelligence for regulated enterprises."
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
