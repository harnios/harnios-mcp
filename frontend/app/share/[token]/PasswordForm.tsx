export function PasswordForm({ token, invalid }: { token: string; invalid: boolean }) {
  return (
    <form method="POST" action={`/share/${encodeURIComponent(token)}/verify`} style={{ display: "grid", gap: "var(--space-3)" }}>
      <p>This shared file is password protected.</p>
      {invalid && <p role="alert">The password was not correct.</p>}
      <label>
        Password
        <input type="password" name="password" required autoFocus />
      </label>
      <button type="submit" className="btn btn--primary">Open shared file</button>
    </form>
  );
}
