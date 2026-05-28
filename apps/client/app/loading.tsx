/* App-wide Suspense fallback — Route шилжих/lazy load үед автоматаар харагдана.
   Минималист skeleton — header-аас доош нь spinner. */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <div className="w-10 h-10 border-[3px] border-app border-t-brand rounded-full animate-spin" />
    </div>
  );
}
