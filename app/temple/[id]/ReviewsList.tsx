type Review = {
  id: string;
  rating: number | string | null;
  comment: string | null;
};

export default function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) {
    return (
      <section className="mt-10 rounded-3xl border border-white/20 bg-white/10 p-6">
        <h2 className="text-3xl font-bold text-[#D4AF37]">Reviews</h2>
        <p className="mt-4 text-white/70">No reviews yet.</p>
      </section>
    );
  }

  const average =
    reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
    reviews.length;

  function stars(rating: number) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }

  return (
    <section className="mt-10 rounded-3xl border border-white/20 bg-white/10 p-6">
      <h2 className="text-3xl font-bold text-[#D4AF37]">Reviews</h2>

      <p className="mt-3 text-white/80">
        Average rating:{" "}
        <span className="font-bold text-[#D4AF37]">
          {average.toFixed(1)} / 5
        </span>
      </p>

      <div className="mt-6 grid gap-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-white/20 bg-black/20 p-5"
          >
            <p className="text-xl text-[#D4AF37]">
              {stars(Number(review.rating))}
            </p>

            <p className="mt-3 text-white/90">{review.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
