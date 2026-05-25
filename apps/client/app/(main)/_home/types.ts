/* Нүүр хуудсаар хэрэглэгдэх shared type-ууд.
   API response-ийн subset-уудыг local-aar нэрлэн ашиглана. */
export interface ApiChannel {
  id:           string;
  name:         string;
  slug:         string;
  kind:         "LIVE" | "TV" | "RADIO";
  thumbnailUrl: string | null;
  orderIndex:   number;
}

export interface Video {
  youtubeId:    string;
  title:        string;
  thumbnailUrl: string;
  duration:     number;
  description?: string;
  publishedAt:  string;
}

export interface Bundle {
  id:           string;
  title:        string;
  thumbnailUrl: string;
  category?:    { id: string; label: string };
  items:        Video[];
}
