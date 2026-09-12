"use client";

import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CopyEmailAddress({
  address,
  name,
}: {
  address: string;
  name: string;
}) {
  const [swapKey, setSwapKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const copiedRef = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
    Clears pending `copied` state timeout on unmount
  */
  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);

      if (!copiedRef.current) {
        copiedRef.current = true;
        setCopied(true);
        setSwapKey((k) => k + 1);
      }

      if (timeout.current) clearTimeout(timeout.current);

      timeout.current = setTimeout(() => {
        copiedRef.current = false;
        setCopied(false);
        setSwapKey((k) => k + 1);
        timeout.current = null;
      }, 1500);
    } catch {
      copiedRef.current = false;
      setCopied(false);
    }
  }

  /*
    Splits at `@` so mobile viewports break after the symbol via `<wbr />`
  */
  const atIndex = address.lastIndexOf("@");
  const local = atIndex === -1 ? address : address.slice(0, atIndex + 1);
  const domain = atIndex === -1 ? "" : address.slice(atIndex + 1);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${name} ${address}`}
      className="group/copy flex w-full flex-1 items-center gap-4 px-4 py-4 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset md:px-5"
    >
      <span className="min-w-0 flex-1 font-mono text-sm leading-snug wrap-break-word text-foreground md:text-base">
        {local}
        <wbr />
        {domain}
      </span>

      <span
        key={swapKey}
        className={cn(
          "inline-flex size-3.5 shrink-0 items-center justify-center",
          {
            "animate-icon-in motion-reduce:animate-none": swapKey > 0,
          },
        )}
      >
        {copied ? (
          <CheckIcon aria-hidden="true" className="size-3.5 text-primary" />
        ) : (
          <CopyIcon
            aria-hidden="true"
            className="size-3.5 text-muted-foreground/50 transition-colors group-hover/copy:text-foreground"
          />
        )}
      </span>

      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {copied ? `${address} copied to clipboard` : null}
      </span>
    </button>
  );
}
