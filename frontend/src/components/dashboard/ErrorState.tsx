// OWNER: Member 2
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
      <p>{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-2 underline">Try again</button>}
    </div>
  );
}
