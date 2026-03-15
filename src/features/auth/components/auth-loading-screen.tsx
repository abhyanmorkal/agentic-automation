import { LoadingSpinnerScreen } from "@/components/loading-spinner-screen";

/**
 * Auth loading state — simple spinner. Used when opening login/signup
 * or when navigating between them.
 */
export function AuthLoadingScreen() {
  return <LoadingSpinnerScreen fullScreen />;
}
