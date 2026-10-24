import { Suspense } from "react";
import { AskPanel } from "@/components/ask-panel";
import { Candidates } from "@/components/candidates";
import { HomeSections } from "@/components/home-sections";
import { NewsFeed } from "@/components/news-feed";
import { parties } from "@/lib/data";
import { getNews } from "@/lib/news";

async function News() {
  const { items, fetchedAt, failedFeeds } = await getNews();
  return (
    <NewsFeed
      items={items}
      fetchedAt={fetchedAt}
      failedFeeds={failedFeeds}
      parties={parties.map(({ id, name, shortName }) => ({ id, name, shortName }))}
    />
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={<div className="h-15" />}>
        <AskPanel />
      </Suspense>
      <HomeSections
        news={
          <Suspense fallback={<p className="text-sm text-graphite">Chargement des flux de presse…</p>}>
            <News />
          </Suspense>
        }
        candidates={<Candidates />}
      />
    </>
  );
}
