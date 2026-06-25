import {
  BackLink,
  EmptyState,
  FeatureCard,
  HeroPanel,
  PageShell,
} from "../../../components/DesignSystem";
import { supabase } from "../../../lib/supabase";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: book } = await supabase
    .from("holy_books")
    .select("*")
    .eq("id", id)
    .single();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("title")
    .eq("book_id", id);

  const bibleBooks = Array.from(
    new Set(chapters?.map((chapter) => chapter.title) || [])
  );

  return (
    <PageShell>
      <BackLink href="/book">Back to Books</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Sacred Text"
        title={book?.title ?? "Holy Book"}
        description={book?.description ?? "Choose a book to continue reading."}
      />

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-[#F5D76E]">Books</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bibleBooks.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <EmptyState title="No chapters found" />
            </div>
          ) : (
            bibleBooks.map((bibleBook) => (
              <FeatureCard
                key={bibleBook}
                href={`/bible-book/${encodeURIComponent(bibleBook)}`}
                eyebrow="Book"
                title={bibleBook}
                className="p-5"
              />
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}
