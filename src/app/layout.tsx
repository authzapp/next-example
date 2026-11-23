import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
export const metadata: Metadata = {
  title: "AuthZapp · Exemplo de login com WhatsApp",
  description: "Exemplo mínimo de integração com o AuthZapp.",
  referrer: "no-referrer", robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>
    <main>{children}</main>
    <a className="github" href="https://github.com/authzapp/next-example" target="_blank" rel="noopener noreferrer">
      <Image src="/github.png" alt="Fork me on GitHub" width={150} height={150} />
    </a>
  </body></html>;
}
