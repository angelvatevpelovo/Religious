import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default async function ReligionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: religion } = await supabase
    .from("religions")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <main className="min-h-screen bg-[#0F2744] p-10 text-white">
      <Link href="/" className="text-[#D4AF37]">
        ← Back to Home
      </Link>

      <section className="mt-12 max-w-3xl">
        <h1 className="text-5xl font-bold text-[#D4AF37]">
          {religion?.name}
        </h1>

        <p className="mt-4 text-xl text-white/80">
          {religion?.description}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/prayers/${id}`}
            className="rounded-2xl border border-white/10 bg-white/10 p-6"
          >
            🙏 Prayers
          </Link>

          <Link href="/assistant" className="rounded-2xl border border-white/10 bg-white/10 p-6">
            ✨ Daily Message
          </Link>

          <Link href="/book" className="rounded-2xl border border-white/10 bg-white/10 p-6">
            📖 Scriptures
          </Link>

          <Link href="/assistant" className="rounded-2xl border border-white/10 bg-white/10 p-6">
            🤖 AI Assistant
          </Link>
        </div>
      </section>
    </main>
  );
}
