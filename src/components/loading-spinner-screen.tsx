import { Loader2Icon } from "lucide-react";

interface LoadingSpinnerScreenProps {
  /** Optional short message below the spinner */
  message?: string;
  /** Use full viewport height (default true for page-level loading) */
  fullScreen?: boolean;
}

/**
 * Simple loading circle (spinner). Use everywhere for consistent loading UI:
 * auth transitions, dashboard loading, etc.
 */
export function LoadingSpinnerScreen({
  message,
  fullScreen = true,
}: LoadingSpinnerScreenProps) {
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-svh flex-col items-center justify-center gap-4"
          : "flex h-full min-h-[200px] flex-col items-center justify-center gap-4"
      }
    >
      <Loader2Icon className="size-8 animate-spin text-primary" />
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
