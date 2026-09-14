import { config } from "@/lib/config";
import { ArrowUpRightIcon } from "lucide-react";

import { MaxWidthWrapper } from "@/components/max-width-wrapper";
import { CopyEmailAddress } from "@/components/copy-email-address";

const steps = [
  {
    index: "01",
    title: "YOU SEND A LINK",
    body: "Place one publicly accessible video URL in the email body.",
  },
  {
    index: "02",
    title: "MUX READS THE TAPE",
    body: "Footage is ingested, captioned, and evaluated by Mux Robots.",
  },
  {
    index: "03",
    title: "JURY WRITES BACK",
    body: `Your official citation arrives as a threaded Re: from ${config.app.name}.`,
  },
];

const eligible = [
  { label: "drive.google.com" },
  { label: "dropbox.com" },
  { label: "direct .mp4 / .mov" },
  { label: "public URLs only", emphasis: true },
];

const specs = [
  { term: "UPLOAD", value: "ZERO" },
  { term: "LINK LIMIT", value: "ONE" },
  { term: "RESPONSE", value: "MINUTES" },
  { term: "VERDICT", value: "GUARANTEED", emphasis: true },
];

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <header>
        <MaxWidthWrapper className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3.5">
          <span className="font-mono text-xs font-medium tracking-[0.22em] text-foreground">
            {config.app.wordmark}
          </span>

          <div className="flex items-center gap-3.5 font-mono text-label tracking-widest text-muted-foreground">
            <span className="hidden md:block">FOOTAGE FESTIVAL</span>

            <span
              className="hidden h-3 w-px bg-border md:block"
              aria-hidden="true"
            />

            <span>MUX × RESEND</span>
          </div>
        </MaxWidthWrapper>
      </header>

      <MaxWidthWrapper
        as="main"
        className="@container flex flex-col gap-y-18 pt-14 pb-20 md:gap-y-28 md:pt-20 md:pb-28"
      >
        <section>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border py-0.5 pr-1.5 pl-2 font-mono text-[0.5rem] leading-none tracking-[0.18em] text-muted-foreground md:py-1 md:text-label md:leading-none">
            <span
              className={`size-1 rounded-full md:size-1.5 ${
                config.submissionsOpen ? "bg-primary" : "bg-muted-foreground/40"
              }`}
              aria-hidden="true"
            />

            <span className="translate-y-[0.21px] md:translate-y-[0.37px]">
              {config.submissionsOpen
                ? "SUBMISSIONS OPEN"
                : "SUBMISSIONS CLOSED"}
            </span>
          </p>

          <div className="grid w-fit max-w-full">
            <h1 className="mt-4 w-fit font-serif text-display tracking-tight text-foreground md:mt-5">
              <span className="block">Email a film.</span>

              <span className="block text-muted-foreground">
                The jury writes back.
              </span>
            </h1>

            <p className="mt-6 w-0 min-w-full text-sm leading-relaxed text-pretty text-muted-foreground md:w-auto md:max-w-prose md:min-w-0 md:text-lg">
              {config.app.name} accepts one public video URL by email. A few
              minutes later, an unnecessarily serious festival citation arrives
              in the same thread.
            </p>
          </div>

          <div className="relative mt-10 overflow-hidden rounded-lg bg-card">
            <div className="flex flex-col md:flex-row">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center border-b border-border px-4 py-2 md:px-5">
                  <h2
                    id="receiving-addresses"
                    className="font-mono text-label tracking-[0.2em] text-muted-foreground"
                  >
                    RECEIVING ADDRESSES
                  </h2>
                </div>

                <ul
                  aria-labelledby="receiving-addresses"
                  className="flex flex-1 list-none flex-col divide-y divide-border"
                >
                  {config.receivingAddresses.map(({ address, name }) => (
                    <li key={address} className="flex flex-1">
                      <CopyEmailAddress address={address} name={name} />
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="relative h-0 border-t border-border md:h-auto md:border-t-0 md:border-l"
                aria-hidden="true"
              >
                <span className="absolute top-0 left-0 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
                <span className="absolute top-0 right-0 z-20 size-3.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-background md:top-auto md:right-auto md:bottom-0 md:left-0 md:-translate-x-1/2 md:translate-y-1/2" />
              </div>

              <div className="px-5 py-5 md:flex md:shrink-0 md:flex-col md:justify-center md:self-stretch md:py-4">
                <dl className="space-y-3 md:w-44">
                  {specs.map(({ term, value, emphasis }) => (
                    <div
                      key={term}
                      className="flex items-baseline font-mono text-label tracking-[0.12em]"
                    >
                      <dt className="shrink-0 text-muted-foreground">{term}</dt>

                      <span
                        className="mx-1.5 min-w-4 flex-1 translate-y-[-0.22em] border-b border-dotted border-muted-foreground/30"
                        aria-hidden="true"
                      />

                      <dd
                        className={
                          emphasis
                            ? "shrink-0 text-primary"
                            : "shrink-0 text-foreground/80"
                        }
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <span
              className="pointer-events-none absolute inset-0 z-10 rounded-lg border border-border"
              aria-hidden="true"
            />
          </div>
        </section>

        <section>
          <h2 className="font-mono text-label tracking-[0.22em] text-foreground/70">
            HOW IT WORKS
          </h2>

          <ol className="mt-7 grid gap-7 md:grid-cols-3 md:gap-8">
            {steps.map((step) => (
              <li
                key={step.index}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] md:block"
              >
                <span className="font-mono text-label leading-5 tracking-widest text-primary">
                  {step.index}
                </span>

                <h3 className="font-mono text-xs leading-5 tracking-[0.14em] text-foreground md:mt-2">
                  {step.title}
                </h3>

                <p className="col-start-2 mt-2 w-[90%] text-sm leading-relaxed text-pretty text-muted-foreground md:w-full">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-mono text-label tracking-[0.22em] text-foreground/70">
            WHAT THE DESK CAN SCREEN
          </h2>

          <ul className="mt-5 grid grid-cols-2 border-t border-border md:grid-cols-4">
            {eligible.map(({ label, emphasis }, i) => {
              const isLeftColMobile = i % 2 === 0;
              const isFirstDesktop = i === 0;

              return (
                <li
                  key={label}
                  className={[
                    "border-border py-3 pr-4 font-mono text-xs",
                    isLeftColMobile ? "border-l-0 pl-0" : "border-l pl-4",
                    i >= 2 ? "border-t" : "border-t-0",
                    isFirstDesktop
                      ? "md:border-l-0 md:pl-0"
                      : "md:border-l md:pl-4",
                    "md:border-t-0",
                    emphasis ? "text-primary" : "text-foreground",
                  ].join(" ")}
                >
                  {label}
                </li>
              );
            })}
          </ul>

          <p className="mt-6 w-[90%] text-sm leading-relaxed text-pretty text-muted-foreground md:w-full">
            One public URL in the body of the email. No attachments, no extra
            postage. If the projection booth cannot fetch the footage, it still
            replies - with a rejection notice, kept fully in character.
          </p>
        </section>
      </MaxWidthWrapper>

      <footer>
        <MaxWidthWrapper className="pb-12 md:pb-14">
          <div className="flex flex-col gap-8 md:flex-row md:items-baseline md:justify-between md:gap-6">
            <div className="flex flex-col items-start gap-3">
              <p className="font-serif text-base leading-relaxed text-foreground/80">
                Built for the&nbsp;
                <a
                  href={config.links.hackathon}
                  target="_blank"
                  rel="noopener"
                  className="text-foreground underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  BestReplyWins
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                &nbsp;hackathon.
              </p>

              <a
                href={config.links.repository}
                target="_blank"
                rel="noopener"
                className="group inline-flex items-center gap-1.5 font-mono text-label tracking-wide text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                Source on GitHub
                <span className="sr-only"> (opens in a new tab)</span>
                <ArrowUpRightIcon
                  className="size-3 transition-transform group-hover:translate-x-px group-hover:-translate-y-px"
                  aria-hidden="true"
                />
              </a>
            </div>

            <div className="flex flex-col items-start gap-2.5 md:items-end md:text-right">
              <h2 className="font-mono text-label tracking-[0.22em] text-foreground/70">
                POWERED BY
              </h2>

              <span className="inline-flex items-center gap-1.5 font-mono text-label tracking-wide text-muted-foreground/70">
                <a
                  href={config.links.muxRobots}
                  target="_blank"
                  rel="noopener"
                  className="underline decoration-muted-foreground/30 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-foreground/50"
                >
                  Mux Robots
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>

                <span className="text-muted-foreground/40" aria-hidden="true">
                  ·
                </span>

                <a
                  href={config.links.resendInbound}
                  target="_blank"
                  rel="noopener"
                  className="underline decoration-muted-foreground/30 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-foreground/50"
                >
                  Resend Inbound
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </span>
            </div>
          </div>

          <div className="mt-12 flex md:justify-end touch:hidden">
            <span className="inline-flex items-center gap-1.5 font-mono text-label tracking-wide text-muted-foreground/50">
              Press
              <kbd className="rounded-sm border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-micro text-foreground/70">
                D
              </kbd>
              to toggle theme
            </span>
          </div>
        </MaxWidthWrapper>
      </footer>
    </div>
  );
}
