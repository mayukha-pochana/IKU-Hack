// True inside the PhaseZero phone app (Capacitor injects window.Capacitor into the page).
type CapacitorWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean } };
export const isNativeApp = () => typeof window !== "undefined" && !!(window as CapacitorWindow).Capacitor?.isNativePlatform?.();
