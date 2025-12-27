export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] flex items-center justify-center">
      <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-8 max-w-md text-center">
        <h1 className="text-xl font-bold text-[var(--bkl-color-text-primary)] mb-2">
          Hey — you don&apos;t have to be here. Shoo.
        </h1>
        <p className="text-[var(--bkl-color-text-secondary)]">
          This area is restricted to admins.
        </p>
      </div>
    </div>
  );
}
