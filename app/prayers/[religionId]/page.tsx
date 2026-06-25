import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default async function PrayersPage({
  params,
}: {
  params: Promise<{ religionId: string }>;
}) {
  const { religionId } = await params;

  const { data: religion } = await supabase
    .from("religions")
    .select("*")
    .eq("id", religionId)
    .single();

  const { data: prayers, error } = await supabase
    .from("prayers")
    .select("*")
    .eq("religion_id", religionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Prayers error:", error);
  }

  return (
    <main className="min-h-screen bg-[#0F2744] p-10 text-white">
      <Link
        href={`/religion/${religionId}`}
        className="text-[#D4AF37] hover:underline"
      >
        ← Back
      </Link>

      <h1 className="mt-10 text-5xl font-bold text-[#D4AF37]">
        Prayers
      </h1>

      <p className="mt-3 text-lg text-white/70">
        {religion?.name}
      </p>

      <div className="mt-10 grid gap-5">
        {!prayers || prayers.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
            <p className="font-semibold">
              Все още няма добавени молитви за тази религия.
            </p>
          </div>
        ) : (
          prayers.map((prayer) => (
            <Link
              key={prayer.id}
              href={`/prayer/${prayer.id}`}
              className="block rounded-2xl border border-white/20 bg-white/10 p-6 transition hover:bg-white/15"
            >
              <h2 className="text-2xl font-bold text-white">
                {prayer.title}
              </h2>

              {prayer.category && (
                <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-[#D4AF37]">
                  {prayer.category}
                </p>
              )}

              <p className="mt-4 leading-7 text-white/90">
                {prayer.content}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
