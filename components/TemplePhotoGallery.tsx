import Image from "next/image";
import { supabase } from "../lib/supabase";

export default async function TemplePhotoGallery({
  templeId,
}: {
  templeId: string;
}) {
  const { data: photos, error } = await supabase
    .from("temple_photos")
    .select("*")
    .eq("temple_id", templeId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <h2 className="mb-4 text-3xl font-bold text-red-400">
          Photos Error
        </h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!photos?.length) {
    return (
      <div className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
        <h2 className="mb-4 text-3xl font-black text-[#F8FAFC]">
          Photos
        </h2>
        <p className="text-[#AFC0D4]">No photos yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <h2 className="mb-6 text-3xl font-black text-[#F8FAFC]">
        Photos ({photos.length})
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        {photos.map((photo) => (
          <Image
            key={photo.id}
            src={photo.image_url}
            alt="Temple photo"
            width={420}
            height={256}
            unoptimized
            className="h-64 w-full rounded-2xl border border-white/10 object-cover"
          />
        ))}
      </div>
    </div>
  );
}
