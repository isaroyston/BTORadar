import { useEffect, useState } from "react";

// Small reference files (application rates, S&CC, resale medians) built into the site.
// A missing or broken file leaves the value null, and the screen goes without it.
const cache = new Map<string, Promise<unknown>>();

export function useStaticJson<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    if (!cache.has(url)) {
      cache.set(
        url,
        fetch(url)
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null),
      );
    }
    cache.get(url)!.then((value) => {
      if (live) setData(value as T | null);
    });
    return () => {
      live = false;
    };
  }, [url]);
  return data;
}
