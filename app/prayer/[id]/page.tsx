import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import FavoriteButton from "../../../components/FavoriteButton";

export default async function PrayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: prayer, error } = await supabase
    .from("prayers")
    .select("*, religions(*)")
    .eq("id", id)
    .single();

  if (error || !prayer) {
    return (
      <main className="min-h-screen bg-[#0F2744] p-10 text-white">
        <Link href="/" className="text-[#D4AF37] hover:underline">
          ← Back
        </Link>

        <h1 className="mt-10 text-4xl font-bold text-[#D4AF37]">
          Prayer not found
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F2744] p-10 text-white">
      <Link
        href={`/prayers/${prayer.religion_id}`}
        className="text-[#D4AF37] hover:underline"
      >
        ← Back to Prayers
      </Link>

      <section className="mx-auto mt-10 max-w-4xl rounded-3xl border border-white/20 bg-white/10 p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#D4AF37]">
          {prayer.religions?.name}
        </p>

        <h1 className="mt-4 text-5xl font-bold text-white">
          {prayer.title}
        </h1>

        {prayer.category && (
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-[#D4AF37]">
            {prayer.category}
          </p>
        )}

        <p className="mt-8 whitespace-pre-line text-lg leading-9 text-white/90">
          {prayer.content}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <FavoriteButton prayerId={prayer.id} />

          <button className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white">
            🔊 Read Aloud
          </button>

          <button className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white">
            📤 Share
          </button>
        </div>
      </section>
    </main>
  );
}
