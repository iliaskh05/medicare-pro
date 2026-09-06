import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchMyAvatarBlob, readStoredAvatarUrl } from "@/lib/api/profile";
import { cn } from "@/lib/utils";

/** Avatar profil (JWT) avec fallback initiales. */
export function UserAvatar({
  initiales,
  className,
  fallbackClassName,
}: {
  initiales: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onAvatar = () => setTick((t) => t + 1);
    window.addEventListener("radiocrm:avatar", onAvatar);
    return () => window.removeEventListener("radiocrm:avatar", onAvatar);
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    if (!readStoredAvatarUrl()) return;
    fetchMyAvatarBlob()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tick]);

  return (
    <Avatar className={cn(className)}>
      {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
      <AvatarFallback className={fallbackClassName}>{initiales}</AvatarFallback>
    </Avatar>
  );
}
