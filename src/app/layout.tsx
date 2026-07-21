import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://savepulse.vercel.app"),
  title: "Pulse — Controlled Dispatch",
  description: "A bystander-first incident brief and evidence-backed handoff to an authorized controlled dispatch desk.",
  applicationName: "Pulse",
  alternates: { canonical: "/" },
  icons: {
    icon: "/pulse-emergency-logo-512.png",
    apple: "/pulse-emergency-logo-512.png",
  },
  openGraph: {
    title: "Pulse — Controlled Dispatch",
    description: "Turn a bystander’s reviewed observations into an evidence-backed controlled dispatch handoff.",
    url: "https://savepulse.vercel.app",
    siteName: "Pulse",
    type: "website",
    images: [{ url: "/pulse-emergency-logo-512.png", width: 512, height: 512, alt: "Pulse controlled dispatch" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse — Controlled Dispatch",
    description: "A bystander-first, evidence-backed controlled dispatch handoff built with GPT-5.6 and Codex.",
    images: ["/pulse-emergency-logo-512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-SG" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
