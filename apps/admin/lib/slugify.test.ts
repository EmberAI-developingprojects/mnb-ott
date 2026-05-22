import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify — Mongolian Cyrillic → URL slug", () => {
  it("Энгийн латин нэрийг доош болгож зайг зураасаар солино", () => {
    expect(slugify("BlueSky Radio")).toBe("bluesky-radio");
  });

  it("Кирилл үсгийг латин руу хөрвүүлнэ", () => {
    expect(slugify("МНБ News")).toBe("mnb-news");
    expect(slugify("Видео сан")).toBe("video-san");
    expect(slugify("Үндсэн суваг")).toBe("undsen-suvag");
  });

  it("Тусгай тэмдэгтийг арилгана", () => {
    expect(slugify("МНБ 1!")).toBe("mnb-1");
    expect(slugify("Кино & Шоу")).toBe("kino-shou");
  });

  it("Олон зай нэг зураас болно", () => {
    expect(slugify("МНБ   News")).toBe("mnb-news");
  });

  it("Эхэн төгсгөлийн зураасуудыг арилгана", () => {
    expect(slugify("  МНБ  ")).toBe("mnb");
    expect(slugify("-test-")).toBe("test");
  });
});
