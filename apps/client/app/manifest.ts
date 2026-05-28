import type { MetadataRoute } from "next";

/* PWA manifest — Хэрэглэгч "Add to home screen" хийхэд app-маяг харагдана.
   FCM/push notification суулгахад заавал шаардлагатай. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "МҮОНРТ OTT",
    short_name:       "МНБ",
    description:      "Монголын Үндэсний Олон Нийтийн Радио Телевизийн онлайн платформ",
    start_url:        "/",
    display:          "standalone",
    background_color: "#141414",
    theme_color:      "#0066B2",
    orientation:      "portrait",
    icons: [
      { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  };
}
