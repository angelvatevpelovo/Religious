"use client";

import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FavoriteVerseButton({ verseId }: { verseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function addFavorite() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setLoading(false);
      router.push("/auth");
      return;
    }

    const { error } = await supabase.from("favorite_verses").insert({
      user_id: userData.user.id,
      verse_id: verseId,
    });

    if (!error) {
      setSaved(true);
    }

    setLoading(false);
  }

  return (
    <button
      onClick={addFavorite}
      disabled={loading || saved}
      className="rounded-xl border border-[#D4AF37]/50 px-3 py-1 text-sm font-bold text-[#D4AF37] hover:bg-[#D4AF37]/10"
    >
      {saved ? "⭐ Saved" : loading ? "Saving..." : "⭐ Favorite"}
    </button>
  );
}
