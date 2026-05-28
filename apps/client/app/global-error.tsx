"use client";

/* Root layout-д error гарах ховор тохиолдол — error.tsx нь дотроос боловсруулж
   чадахгүй (layout өөрөө унасан). global-error нь өөрийн <html>+<body> render
   хийнэ. Минимум HTML — globals.css ч ажиллахгүй магадлалтай тул inline-аар. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="mn">
      <body style={{
        margin: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#141414",
        color: "#f5f5f8",
        fontFamily: "-apple-system, system-ui, sans-serif",
        padding: "24px",
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Системийн алдаа</h1>
          <p style={{ opacity: 0.7, fontSize: "14px", marginBottom: "20px" }}>
            Гэнэтийн алдаа гарлаа. Хуудсыг дахин ачаалаад үзнэ үү.
          </p>
          <button onClick={reset} style={{
            padding: "10px 22px",
            borderRadius: "999px",
            background: "#0066B2",
            color: "white",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "14px",
          }}>
            Дахин ачаалах
          </button>
        </div>
      </body>
    </html>
  );
}
