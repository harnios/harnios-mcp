/** Link back to the root dashboard (spec 026), shown at the top of every
 * top-level page — otherwise a user who navigates away from "/" has no way
 * back except editing the URL by hand. Plain `<a>`, matching every other
 * link in these pages (no client-side router is used here). */
export function HomeLink({ label }: { label: string }) {
  return (
    <p style={{ margin: "0 0 1rem" }}>
      <a href="/" style={{ fontSize: 14, color: "#666" }}>
        ← {label}
      </a>
    </p>
  );
}
