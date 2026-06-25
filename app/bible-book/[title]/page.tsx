import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default async function BibleBookPage({
  params,
}: {
  params: Promise<{ title: string }>;
}) {
  const { title } = await params;
  const bookTitle = decodeURIComponent(title);

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("title", bookTitle)
    .order("chapter_number", { ascending: true });

  return (
    <main className="min-h-screen bg-[#0F2744] p-10 text-white">
      <Link href="/" className="text-[#D4AF37] hover:underline">
        ← Back to Home
      </Link>

      <h1 className="mt-10 text-5xl font-bold text-[#D4AF37]">
        {bookTitle}
      </h1>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {!chapters || chapters.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 md:col-span-2 lg:col-span-3">
            <p className="text-white/70">No chapters found for this book.</p>
          </div>
        ) : (
          chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/chapter/${chapter.id}`}
              className="rounded-2xl border border-white/20 bg-white/10 p-6 transition hover:bg-white/15"
            >
              <h2 className="text-2xl font-bold text-white">
                Chapter {chapter.chapter_number}
              </h2>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
