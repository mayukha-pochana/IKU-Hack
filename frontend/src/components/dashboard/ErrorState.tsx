// OWNER: Member 2
import { Notice } from "@/components/ui/pz";
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Notice tone="danger">
      <p>{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="pz-link mt-1">Try again</button>}
    </Notice>
  );
}
