import {
  BackLink,
  EmptyState,
  FeatureCard,
  HeroPanel,
  PageShell,
} from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const { data: books, error } = await supabase
    .from("holy_books")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Holy books error:", error);
  }

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Sacred Library"
        title="Holy Books"
        description="A peaceful library for sacred texts, organized for reading and reflection."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {!books || books.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              title="No holy books yet"
              description="When sacred texts are added, they will appear here."
            />
          </div>
        ) : (
          books.map((book) => (
            <FeatureCard
              key={book.id}
              href={`/book/${book.id}`}
              eyebrow="Sacred Text"
              title={book.title}
              description={book.description}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}
