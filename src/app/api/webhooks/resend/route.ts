import { getMuxClient } from "@/lib/mux";
import { extractMediaUrl } from "@/lib/media";

import {
  getReceivedEmail,
  getResendClient,
  getResendWebhookSecret,
  getReceivingAddresses,
  type RejectionReason,
  getSenderAddress,
  sendThreadedReply,
} from "@/lib/resend";

export const runtime = "nodejs";

function targetsReceivingAddress(addresses: string[]) {
  const expected = getReceivingAddresses();
  return addresses.some((address) => expected.includes(address.toLowerCase()));
}

async function reject(emailId: string, reason: RejectionReason) {
  await sendThreadedReply({
    emailId,
    kind: "notice",
    reason,
  });
}

export async function POST(request: Request) {
  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return new Response("Invalid webhook", { status: 400 });
  }

  let event;

  try {
    event = getResendClient().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: getResendWebhookSecret(),
    });
  } catch {
    return new Response("Invalid webhook", { status: 400 });
  }

  if (event.type !== "email.received") {
    return new Response(null, { status: 200 });
  }

  const emailId = event.data.email_id;

  /*
    Drops self-sent messages to prevent auto-reply loops and ignores emails
    not addressed to an active festival inbox alias.
  */
  if (
    !targetsReceivingAddress([...event.data.to, ...event.data.received_for]) ||
    event.data.from.toLowerCase() === getSenderAddress()
  ) {
    return new Response(null, { status: 200 });
  }

  try {
    /*
      The inbound webhook delivers metadata only; the full body must be
      retrieved separately to extract submitted media links.
    */
    const email = await getReceivedEmail(emailId);
    const media = extractMediaUrl(email.text, email.html);

    if (media.status !== "found") {
      const reason: RejectionReason =
        media.status === "ambiguous"
          ? "ambiguous_media"
          : media.status === "unsupported"
            ? "unsupported_media"
            : "missing_media";

      await reject(emailId, reason);
      return new Response(null, { status: 200 });
    }

    try {
      await getMuxClient().video.assets.create(
        {
          inputs: [
            {
              url: media.url,
            },
          ],
          passthrough: emailId,
          playback_policies: ["public"],
          video_quality: "basic",
        },
        { idempotencyKey: `ingest/${emailId}` },
      );
    } catch (error) {
      console.error("Mux asset creation failed", error);
      await reject(emailId, "ingest_failed");
      return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Resend inbound processing failed", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
