import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copy text to the clipboard and report a short-lived "copied" state for the
 * button that triggered it. This fork never opens URLs: every link in the UI
 * is shown as text and copied on click, so the user decides where it goes.
 */
export const useCopyToClipboard = (resetAfterMs = 1500) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetAfterMs);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
};
