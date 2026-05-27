import type { Request, Response, NextFunction } from "express";

/* HTTP Cache-Control middleware factory.
   Зөвхөн GET request-д cache header нэмнэ — POST/PATCH/DELETE үед write үйлдэл
   тул cache хийх ёсгүй. Error response (status >= 400)-д ч cache хийхгүй.

   public:  CDN, proxy, browser бүгд cache хийж болно. User-аас хамаардаггүй
            response-д л ашиглана (channel epg, vod listing, г.м.).
   private: зөвхөн browser cache хийнэ. User-specific response-д (auth, г.м.).

   Жишээ хэрэглээ:
     router.get("/", cacheControl(120, "public"), handler);
*/
export function cacheControl(maxAgeSeconds: number, scope: "public" | "private" = "public") {
  const value = `${scope}, max-age=${maxAgeSeconds}`;
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();
    /* Status code тогтсоны дараа Cache-Control-ийг conditionally арилгана.
       4xx/5xx error response-ыг cache хийх ёсгүй. */
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) res.setHeader("Cache-Control", value);
      return originalJson(body);
    };
    next();
  };
}
