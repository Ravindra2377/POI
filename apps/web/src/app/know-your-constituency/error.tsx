"use client";

export default function Error() {
  return (
    <div className="error-state" role="alert">
      <h3>Constituency records could not be loaded</h3>
      <p>
        The prepared catalogue is temporarily unavailable. No record is being
        substituted.
      </p>
    </div>
  );
}
