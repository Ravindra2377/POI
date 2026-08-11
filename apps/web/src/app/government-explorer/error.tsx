"use client";

export default function GovernmentExplorerError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main>
      <h1>Government Explorer is temporarily unavailable</h1>
      <button onClick={reset} type="button">
        Try again
      </button>
    </main>
  );
}
