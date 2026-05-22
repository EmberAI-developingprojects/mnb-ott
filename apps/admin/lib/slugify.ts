/* Mongolian Cyrillic → Latin slug. URL-д ашиглах техникийн нэр гарга.
   Жишээ: "МНБ News" → "mnb-news", "Видео сан 2" → "video-san-2" */

const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "",  ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[а-яёөү]/g, (c) => CYRILLIC_MAP[c] ?? "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
