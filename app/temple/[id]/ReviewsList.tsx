type Review = {
  id: string;
  rating: number | string | null;
  comment: string | null;
};

function stars(rating: number) {
  const safeRating = Math.min(5, Math.max(0, Math.round(rating)));
  return "\u2605".repeat(safeRating) + "\u2606".repeat(5 - safeRating);
}

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) {
    return (
      <section className="mt-10 rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <h2 className="text-3xl font-black text-[#F8FAFC]">Reviews</h2>
        <p className="mt-4 text-[#AFC0D4]">No reviews yet.</p>
      </section>
    );
  }

  const average =
    reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
    reviews.length;

  return (
    <section className="mt-10 rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <h2 className="text-3xl font-black text-[#F8FAFC]">Reviews</h2>

      <p className="mt-3 text-[#CBD5E1]">
        Average rating:{" "}
        <span className="font-bold text-[#D4AF37]">
          {average.toFixed(1)} / 5
        </span>
      </p>

      <div className="mt-6 grid gap-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-white/12 bg-[#030817]/50 p-5"
          >
            <p className="text-xl text-[#D4AF37]">
              {stars(Number(review.rating))}
            </p>

            <p className="mt-3 text-[#DCE7F4]">{review.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
