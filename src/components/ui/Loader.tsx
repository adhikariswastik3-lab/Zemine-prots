/** Pixel Z logo loader used for route transitions and splash states. */
export default function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <main className="screen no-nav loader-screen" id="main" role="status" aria-live="polite">
      <img src="/logo.png" alt="" width={72} height={72} className="loader-mark" />
      <p className="eyebrow">{label}</p>
    </main>
  );
}
