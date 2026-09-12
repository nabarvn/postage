import { cn } from "@/lib/utils";
import { type PropsWithChildren } from "react";

export function MaxWidthWrapper({
  as: Comp = "div",
  className,
  children,
}: PropsWithChildren<{
  as?: "div" | "main";
  className?: string;
}>) {
  return (
    <Comp className={cn("mx-auto w-full max-w-3xl px-5 md:px-8", className)}>
      {children}
    </Comp>
  );
}
