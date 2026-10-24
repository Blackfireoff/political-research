import type { Metadata, Viewport } from "next";
import { Literata, Schibsted_Grotesk } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { TabBar, TopNav } from "@/components/nav";
import { SearchBar, SearchBarFallback } from "@/components/search-bar";
import { partiesFile } from "@/lib/data";
import "./globals.css";

const ui = Schibsted_Grotesk({ variable: "--font-ui", subsets: ["latin"] });
const read = Literata({ variable: "--font-read", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Recoupe, présidentielle 2027",
  description:
    "Consulter les programmes officiels des partis, suivre l'actualité et vérifier une affirmation à partir de sources citées.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1724" },
  ],
};

const firstRound = new Date(`${partiesFile.election.firstRound}T12:00:00`).toLocaleDateString("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${ui.variable} ${read.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-8 px-4 lg:h-14">
            <Link href="/" className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
              Recoupe
            </Link>
            <TopNav />
          </div>
        </header>
        {/* Recherche sous l'en-tête ; elle reste en haut de l'écran pendant le défilement. */}
        <div className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl px-3 py-2.5 sm:px-4">
            <Suspense fallback={<SearchBarFallback />}>
              <SearchBar />
            </Suspense>
          </div>
        </div>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-rule pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-graphite">
            Premier tour le{" "}
            <a href={partiesFile.election.sourceUrl} className="underline decoration-rule underline-offset-2">
              {firstRound}
            </a>
            . Outil indépendant, sans affiliation partisane. Les réponses de l&apos;IA sont générées à partir des
            sources affichées et peuvent contenir des erreurs : vérifiez toujours les passages cités. Données sur les
            partis vérifiées le {new Date(partiesFile.generatedOn).toLocaleDateString("fr-FR")}.
          </div>
        </footer>
        <TabBar />
      </body>
    </html>
  );
}
