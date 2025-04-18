import type { Metadata } from "next";
import { EdgeStoreProvider } from "./context/edgestore";
import "./globals.css";
import {
  ClerkProvider
} from '@clerk/nextjs'


export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={``}>
          <EdgeStoreProvider>{children}</EdgeStoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
