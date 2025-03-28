import type {Metadata} from "next";
import {SessionProvider} from "next-auth/react";
import {Geist, Geist_Mono} from "next/font/google";

import "./globals.css";

const fontSans = Geist({variable: "--font-geist-sans", subsets: ["latin"]});
const fontMono = Geist_Mono({variable: "--font-geist-mono", subsets: ["latin"]});

export const metadata: Metadata = {
    title: "AuthZapp Example App",
    description: "Example App using Login with WhatsApp",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <SessionProvider>
            {children}
        </SessionProvider>
        </body>
        </html>
    );
}
