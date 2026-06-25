"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function FavoriteButton({ prayerId }: { prayerId: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadFavoriteStatus() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return;

      setUserId(user.id);

      const { data: favorite } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_type", "prayer")
        .eq("item_id", prayerId)
        .maybeSingle();

      setIsFavorite(!!favorite);
    }

    loadFavoriteStatus();
  }, [prayerId]);

  async function toggleFavorite() {
    if (!userId) {
      router.push("/auth");
      return;
    }

    setLoading(true);
    setMessage("");

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("item_type", "prayer")
        .eq("item_id", prayerId);

      if (error) {
        setMessage(error.message);
      } else {
        setIsFavorite(false);
      }
    } else {
      const { error } = await supabase.from("favorites").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        item_type: "prayer",
        item_id: prayerId,
      });

      if (error) {
        setMessage(error.message);
        console.error("Favorite insert error:", error);
      } else {
        setIsFavorite(true);
      }
    }

    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={toggleFavorite}
        disabled={loading}
        className="rounded-xl bg-[#D4AF37] px-5 py-3 font-bold text-[#0F2744]"
      >
        {loading ? "Loading..." : isFavorite ? "💛 Favorited" : "🤍 Favorite"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}
