"use client";

export default function BudgetError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <h3>Budget lines could not be loaded</h3>
      <p>No budget figure is being substituted.</p>
      <button
        className="button button--secondary"
        onClick={reset}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}
