import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Exemplo AuthZapp · Login com WhatsApp",
  description: "Exemplo mínimo de integração com o AuthZapp.",
  referrer: "no-referrer", robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body><main>{children}</main></body></html>;
}
