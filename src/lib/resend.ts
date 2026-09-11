import "server-only";

import { Resend } from "resend";

import { config } from "@/lib/config";
import { requiredEnv } from "@/lib/env";
import type { FestivalCitationVariables } from "@/lib/reply";

let client: Resend | undefined;
const CONCURRENT_RETRY_DELAYS_MS = [150, 400, 900];

export type RejectionReason =
  | "missing_media"
  | "ambiguous_media"
  | "unsupported_media"
  | "ingest_failed"
  | "screening_failed";

const REJECTION_NOTICES: Record<RejectionReason, string> = {
  missing_media:
    "The correspondence arrived without a usable public video link.",
  ambiguous_media:
    "Multiple potential entries arrived, and the committee declined to guess between them.",
  unsupported_media:
    "Audio arrived without picture, and the booth only screens video.",
  ingest_failed:
    "The link arrived, but the projection booth could not retrieve it.",
  screening_failed:
    "The entry reached the booth, but the screening could not be completed.",
};

type ThreadedReply =
  | {
      emailId: string;
      kind: "notice";
      reason: RejectionReason;
    }
  | {
      emailId: string;
      kind: "citation";
      variables: FestivalCitationVariables;
    };

export function getResendClient() {
  client ??= new Resend(requiredEnv("RESEND_API_KEY"));
  return client;
}

export function getResendWebhookSecret() {
  return requiredEnv("RESEND_WEBHOOK_SECRET");
}

function extractEmailAddress(value: string) {
  return (value.match(/<([^>]+)>/)?.[1] ?? value).trim();
}

/*
  Normalizes display names so outbound sender headers match the wordmark
*/
function brandedFrom(value: string) {
  return `${config.app.name} <${extractEmailAddress(value)}>`;
}

export function getResendFrom() {
  return brandedFrom(requiredEnv("RESEND_FROM"));
}

function getReplyTemplateId(kind: ThreadedReply["kind"]) {
  return requiredEnv(
    kind === "citation"
      ? "RESEND_CITATION_TEMPLATE_ID"
      : "RESEND_NOTICE_TEMPLATE_ID",
  );
}

export function getReceivingAddresses() {
  const custom = process.env.NEXT_PUBLIC_CUSTOM_RECEIVING_ADDRESS?.trim();

  return [
    requiredEnv("NEXT_PUBLIC_RESEND_RECEIVING_ADDRESS"),
    ...(custom ? [custom] : []),
  ].map((address) => address.toLowerCase());
}

export function getSenderAddress(value = getResendFrom()) {
  return extractEmailAddress(value).toLowerCase();
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function getReceivedEmail(emailId: string) {
  const { data, error } = await getResendClient().emails.receiving.get(emailId);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to retrieve received email");
  }

  return data;
}

export async function sendThreadedReply(reply: ThreadedReply) {
  const { emailId, kind } = reply;
  const email = await getReceivedEmail(emailId);
  const subject = email.subject.replace(/^re:\s*/i, "") || "your submission";
  const to = email.reply_to?.[0] || email.from;

  const payload = {
    from: getResendFrom(),
    to,
    subject: `Re: ${subject}`,
    template:
      kind === "citation"
        ? {
            id: getReplyTemplateId(kind),
            variables: reply.variables,
          }
        : {
            id: getReplyTemplateId(kind),
            variables: {
              NOTICE: REJECTION_NOTICES[reply.reason],
            },
          },
    headers: {
      "In-Reply-To": email.message_id,
    },
  };

  const idempotencyKey = `${kind}/${emailId}`;

  for (let attempt = 0; ; attempt += 1) {
    const { data, error } = await getResendClient().emails.send(payload, {
      idempotencyKey,
    });

    if (data) return data;

    if (error?.name === "invalid_idempotent_request") {
      console.warn("Resend suppressed a conflicting duplicate email", {
        emailId,
        idempotencyKey,
      });

      return null;
    }

    /*
      Retries with jitter when concurrent requests collide on the same idempotency
      key, allowing the in-flight request to resolve or clear the lock.
    */
    if (
      error?.name === "concurrent_idempotent_requests" &&
      attempt < CONCURRENT_RETRY_DELAYS_MS.length
    ) {
      const jitter = Math.floor(Math.random() * 100);
      await wait(CONCURRENT_RETRY_DELAYS_MS[attempt] + jitter);
      continue;
    }

    throw new Error(error?.message ?? "Unable to send threaded reply");
  }
}
