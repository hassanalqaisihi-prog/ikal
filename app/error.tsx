"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <p className="text-lg font-bold text-pink">حدث خطأ · Something went wrong</p>
      <button onClick={reset} className="btn-primary mt-4">↻</button>
    </div>
  );
}
