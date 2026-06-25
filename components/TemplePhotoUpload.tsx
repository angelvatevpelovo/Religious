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
    <div className="rounded-3xl border border-white/20 bg-white/5 p-6">
      <h2 className="mb-4 text-3xl font-bold text-[#D4AF37]">
        Upload Photo
      </h2>

      <input
        type="file"
        accept="image/*"
        onChange={uploadPhoto}
        disabled={uploading}
        className="text-white"
      />

      {uploading && <p className="mt-4 text-white/70">Uploading...</p>}
    </div>
  );
}
