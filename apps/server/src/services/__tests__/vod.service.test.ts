import { describe, it, expect, vi, beforeEach } from "vitest";

/* library.service.ts-ийн classifyContent болон тус бүр slice helper-уудыг шалгана.
   YouTube pool-ийг mock хийгээд index-ээр content kind (archive/library/bundle)
   зөв буцаж байгааг баталгаажуулна. PPV access check энэ дээр тулгуурладаг. */

const fakePool = Array.from({ length: 25 }, (_, i) => ({
  youtubeId:    `vid${String(i).padStart(2, "0")}`,
  title:        `Видео ${i}`,
  description:  "",
  thumbnailUrl: `https://img/${i}.jpg`,
  publishedAt:  new Date(2025, 0, i + 1).toISOString(),
  duration:     600,
  viewCount:    100 + i,
  channelTitle: "MNB",
}));

vi.mock("../youtube.service", () => ({
  getYoutubeVideos: vi.fn(async () => ({ videos: fakePool, totalResults: fakePool.length })),
  /* detectGenre — энгийн mock; тестүүд genre-ийн оноох логикоос үл хамаарна. */
  detectGenre: vi.fn(() => "Бусад"),
}));

import {
  classifyContent,
  getArchiveLatest,
  getLibraryLatest,
  getBundles,
  getBundleById,
} from "../library.service";

describe("library.service.classifyContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("эхний 5 видео нь архив (archive) болно", async () => {
    /* Pool index 0..4 → архив. Үнэгүй, нэвтэрсэн хэрэглэгчид нээлттэй. */
    const res = await classifyContent("vid00");
    expect(res.kind).toBe("archive");
    expect(res.price).toBeUndefined();
    expect(res.bundleId).toBeUndefined();
  });

  it("Index 5..9 нь премиум сан (library) болно", async () => {
    const res = await classifyContent("vid07");
    expect(res.kind).toBe("library");
  });

  it("Index 10..14 нь эхний bundle-д (documentary) хамаарна", async () => {
    /* Bundle slice: pool[10..14] → bundle id 'documentary'. */
    const res = await classifyContent("vid10");
    expect(res.kind).toBe("bundle");
    expect(res.bundleId).toBe("documentary");
    expect(res.price).toBe(1900); // inIdx=0 → 1900 + 0*300
  });

  it("Bundle item доторх index-ээр үнэ нь өсөнө", async () => {
    /* pool[12] → bundle 0, inIdx=2 → 1900 + 600 = 2500 */
    const res = await classifyContent("vid12");
    expect(res.kind).toBe("bundle");
    expect(res.bundleId).toBe("documentary");
    expect(res.price).toBe(2500);
  });

  it("Хоёр дахь bundle (shows) — pool[15..19]", async () => {
    const res = await classifyContent("vid15");
    expect(res.kind).toBe("bundle");
    expect(res.bundleId).toBe("shows");
  });

  it("Pool-д байхгүй ID үед архив гэж үзэх (default safe)", async () => {
    const res = await classifyContent("not-in-pool");
    expect(res.kind).toBe("archive");
  });
});

describe("library.service slice helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getArchiveLatest нь эхний N видеог буцаана", async () => {
    const res = await getArchiveLatest(3);
    expect(res).toHaveLength(3);
    expect(res[0].youtubeId).toBe("vid00");
    expect(res[2].youtubeId).toBe("vid02");
  });

  it("getLibraryLatest нь pool[5..]-ээс эхэлнэ (премиум сан)", async () => {
    const res = await getLibraryLatest(2);
    expect(res).toHaveLength(2);
    expect(res[0].youtubeId).toBe("vid05");
    expect(res[1].youtubeId).toBe("vid06");
  });

  it("getBundles — 3 bundle буцаагдана (item-тэй)", async () => {
    const res = await getBundles(5);
    expect(res.length).toBeGreaterThanOrEqual(2);
    /* Bundle id-ууд нь metadata-аас, тэгээд тус бүрт price байх ёстой. */
    expect(res[0].id).toBe("documentary");
    expect(res[0].items[0].price).toBe(1900);
    expect(res[0].items[1].price).toBe(2200);
  });

  it("getBundleById — мэдэгдсэн ID-аар bundle буцаана", async () => {
    const b = await getBundleById("shows");
    expect(b).not.toBeNull();
    expect(b!.id).toBe("shows");
  });

  it("getBundleById — байхгүй ID үед null", async () => {
    const b = await getBundleById("nonexistent");
    expect(b).toBeNull();
  });
});
