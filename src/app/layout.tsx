import type {Metadata} from "next";
import {SessionProvider} from "next-auth/react";
import {Geist, Geist_Mono} from "next/font/google";

import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const fontSans = Geist({variable: "--font-geist-sans", subsets: ["latin"]});
const fontMono = Geist_Mono({variable: "--font-geist-mono", subsets: ["latin"]});

export const metadata: Metadata = {
    title: "AuthZapp Example App",
    description: "Example App using Login with WhatsApp",
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
        <SessionProvider>
            <div className="screen">
                {children}
            </div>
            <Link className="github" href={'https://github.com/authzapp/next-example'} target="_blank">
                <Image src={'/github.png'} alt={'fork me on github'} width={150} height={150} />
            </Link>
        </SessionProvider>
        </body>
        </html>
    );
}
