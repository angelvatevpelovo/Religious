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
    <section className="mt-10 rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <h2 className="text-3xl font-black text-[#F8FAFC]">Add Review</h2>

      <label className="mt-5 block text-sm font-bold uppercase tracking-[0.16em] text-[#F5D76E]">
        Rating
      </label>
      <select
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="mt-2 rounded-2xl border border-white/12 bg-[#030817]/72 p-3 text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]/70"
      >
        <option value={5}>{"\u2605\u2605\u2605\u2605\u2605"} 5</option>
        <option value={4}>{"\u2605\u2605\u2605\u2605\u2606"} 4</option>
        <option value={3}>{"\u2605\u2605\u2605\u2606\u2606"} 3</option>
        <option value={2}>{"\u2605\u2605\u2606\u2606\u2606"} 2</option>
        <option value={1}>{"\u2605\u2606\u2606\u2606\u2606"} 1</option>
      </select>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your review..."
        className="mt-5 min-h-32 w-full rounded-2xl border border-white/12 bg-[#030817]/72 p-4 text-[#F8FAFC] outline-none transition placeholder:text-[#7890AA] focus:border-[#D4AF37]/70"
      />

      <button
        type="button"
        onClick={submitReview}
        disabled={saving}
        className="mt-5 rounded-2xl bg-[#D4AF37] px-6 py-3 font-black text-[#071A2F] transition hover:bg-[#F5D76E] disabled:opacity-50"
      >
        {saving ? "Saving..." : "Submit Review"}
      </button>

      {message && <p className="mt-4 text-[#AFC0D4]">{message}</p>}
    </section>
  );
}
