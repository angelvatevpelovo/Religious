export type TempleMapTemple = {
  id: string;
  name: string | null;
  religion: string | null;
  country: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  image_url: string | null;
};

export type TempleListTemple = TempleMapTemple & {
  denomination: string | null;
  address: string | null;
  description: string | null;
  website_url: string | null;
  created_at: string | null;
};
