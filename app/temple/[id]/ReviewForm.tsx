"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ReviewForm({ templeId }: { templeId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submitReview() {
    if (!comment.trim()) {
      setMessage("Please write a comment.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setMessage("Please login to add a review.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("temple_reviews").insert({
      temple_id: templeId,
      user_id: userData.user.id,
      rating,
      comment,
    });

    if (error) {
      setMessage("Could not save review.");
      setSaving(false);
      return;
    }

    setComment("");
    setRating(5);
    setMessage("Review added successfully.");
    setSaving(false);

    window.location.reload();
  }

  return (
    <section className="mt-10 rounded-3xl border border-white/20 bg-white/10 p-6">
      <h2 className="text-3xl font-bold text-[#D4AF37]">Add Review</h2>

      <label className="mt-5 block text-white/70">Rating</label>
      <select
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="mt-2 rounded-xl border border-white/20 bg-[#0F2744] p-3 text-white"
      >
        <option value={5}>★★★★★ 5</option>
        <option value={4}>★★★★☆ 4</option>
        <option value={3}>★★★☆☆ 3</option>
        <option value={2}>★★☆☆☆ 2</option>
        <option value={1}>★☆☆☆☆ 1</option>
      </select>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your review..."
        className="mt-5 min-h-32 w-full rounded-2xl border border-white/20 bg-white/10 p-4 text-white outline-none placeholder:text-white/50"
      />

      <button
        onClick={submitReview}
        disabled={saving}
        className="mt-5 rounded-2xl bg-[#D4AF37] px-6 py-3 font-bold text-[#0F2744] disabled:opacity-50"
      >
        {saving ? "Saving..." : "Submit Review"}
      </button>

      {message && <p className="mt-4 text-white/70">{message}</p>}
    </section>
  );
}