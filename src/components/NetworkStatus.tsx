import * as React from "react";

export function NetworkStatus() {
  const [offline, setOffline] = React.useState(!window.navigator.onLine);
  const [hideAfterOnline, setHideAfterOnline] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleOnline = () => {
      setOffline(false);
      setHideAfterOnline(true);
      timeoutId = setTimeout(() => setHideAfterOnline(false), 3000);
    };
    const handleOffline = () => {
      setOffline(true);
      setHideAfterOnline(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline || hideAfterOnline) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-600 text-amber-950 px-4 py-2 text-center text-sm font-medium">
      You are offline. Changes will not be saved.
    </div>
  );
}
