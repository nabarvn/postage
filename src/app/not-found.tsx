import Link from "next/link";
import { MaxWidthWrapper } from "@/components/max-width-wrapper";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <MaxWidthWrapper
        as="main"
        className="flex flex-col items-center gap-8 text-center"
      >
        <p className="font-mono text-label font-medium tracking-[0.22em] text-muted-foreground">
          404
        </p>

        <h1 className="font-serif text-5xl tracking-tight text-foreground md:text-6xl">
          <span className="block">This page.</span>

          <span className="block text-muted-foreground">
            It doesn&apos;t exist.
          </span>
        </h1>

        <Link
          href="/"
          className="font-mono text-label tracking-wide text-foreground underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
        >
          Go home
        </Link>
      </MaxWidthWrapper>
    </div>
  );
}
