"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function TemplePhotoUpload({ templeId }: { templeId: string }) {
  const [uploading, setUploading] = useState(false);

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        alert("Please login to upload a photo.");
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${templeId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("temple-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        alert(`Storage error: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("temple-photos")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("temple_photos")
        .insert({
          temple_id: templeId,
          image_url: data.publicUrl,
          user_id: userData.user.id,
          uploaded_by: userData.user.id,
        });

      if (insertError) {
        alert(`Database error: ${insertError.message}`);
        return;
      }

      alert("Photo uploaded successfully!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Unexpected upload error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
      <h2 className="mb-4 text-3xl font-black text-[#F8FAFC]">
        Upload Photo
      </h2>

      <input
        type="file"
        accept="image/*"
        onChange={uploadPhoto}
        disabled={uploading}
        className="w-full rounded-2xl border border-white/12 bg-[#030817]/72 p-3 text-[#CBD5E1] file:mr-4 file:rounded-xl file:border-0 file:bg-[#D4AF37] file:px-4 file:py-2 file:font-bold file:text-[#071A2F]"
      />

      {uploading && <p className="mt-4 text-[#AFC0D4]">Uploading...</p>}
    </div>
  );
}
