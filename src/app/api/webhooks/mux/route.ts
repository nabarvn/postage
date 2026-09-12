import { getMuxClient, getMuxWebhookSecret } from "@/lib/mux";
import { type RejectionReason, sendThreadedReply } from "@/lib/resend";

import {
  getFestivalCitationVariables,
  getNoteQuestion,
  SCREENING_QUESTIONS,
} from "@/lib/reply";

import type {
  AskQuestionsJob,
  AskQuestionsJobOutputs,
} from "@mux/mux-node/resources/robots/jobs/ask-questions";

import type { Asset } from "@mux/mux-node/resources/video/assets";
import type { WebhookAsset } from "@mux/mux-node/resources/webhooks/webhooks";
import type { FindKeyMomentsJob } from "@mux/mux-node/resources/robots/jobs/find-key-moments";

export const runtime = "nodejs";

const SCOPE_END_INSET_MS = 1;
const NOTE_QUESTION_COUNT = 1;
const RETAINED_ASSET_LIMIT = 5;
const COMBINED_QUESTION_COUNT = 6;
const RETAINED_ASSET_PREFIX = "postage:retained:";
const GENERATED_CAPTION_NAME = "Auto-generated captions";

async function deleteProcessedAsset(assetId?: string) {
  if (!assetId) return;

  try {
    await getMuxClient().video.assets.delete(assetId);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 404
    ) {
      return;
    }

    throw error;
  }
}

async function rejectAndDeleteAsset({
  emailId,
  reason,
  assetId,
}: {
  emailId?: string;
  reason: RejectionReason;
  assetId?: string;
}) {
  if (emailId) {
    await sendThreadedReply({
      emailId,
      kind: "notice",
      reason,
    });
  }

  await deleteProcessedAsset(assetId);
}

async function retainProcessedAsset(assetId: string, emailId: string) {
  const mux = getMuxClient();

  await mux.video.assets.update(assetId, {
    passthrough: `${RETAINED_ASSET_PREFIX}${emailId}`,
  });

  const assets = await mux.video.assets.list({ limit: 100 });

  const retained = assets.data
    .filter((asset) => asset.passthrough?.startsWith(RETAINED_ASSET_PREFIX))
    .sort(
      (left, right) =>
        Number(right.created_at) - Number(left.created_at) ||
        right.id.localeCompare(left.id),
    );

  for (const asset of retained.slice(RETAINED_ASSET_LIMIT)) {
    await deleteProcessedAsset(asset.id);
  }
}

async function getAskQuestionsJobs(assetId: string) {
  const mux = getMuxClient();

  const jobs = await mux.robots.jobs.list({
    asset_id: assetId,
    workflow: "ask-questions",
    limit: 100,
  });

  return Promise.all(
    jobs.data.map((job) => mux.robots.jobs.askQuestions.retrieve(job.id)),
  );
}

function findAskQuestionsJob(
  jobs: AskQuestionsJob[],
  emailId: string,
  questionCount: number,
) {
  return jobs.find(
    (job) =>
      job.passthrough === emailId &&
      job.parameters.questions.length === questionCount,
  );
}

async function getScreeningJob(assetId: string, emailId: string) {
  const jobs = await getAskQuestionsJobs(assetId);
  return findAskQuestionsJob(jobs, emailId, SCREENING_QUESTIONS.length);
}

async function getKeyMomentsJob(assetId: string, emailId: string) {
  const mux = getMuxClient();

  const jobs = await mux.robots.jobs.list({
    asset_id: assetId,
    workflow: "find-key-moments",
    limit: 100,
  });

  for (const summary of jobs.data) {
    const job = await mux.robots.jobs.findKeyMoments.retrieve(summary.id);
    if (job.passthrough === emailId) return job;
  }

  return undefined;
}

async function startScreening(assetId: string, emailId: string) {
  const mux = getMuxClient();
  const existing = await getScreeningJob(assetId, emailId);
  if (existing) return existing;

  return mux.robots.jobs.askQuestions.create(
    {
      passthrough: emailId,
      parameters: {
        asset_id: assetId,
        questions: SCREENING_QUESTIONS,
        max_free_form_answer_length: 300,
      },
    },
    { idempotencyKey: `screen/${assetId}` },
  );
}

async function startKeyMoments(assetId: string, emailId: string) {
  const mux = getMuxClient();
  const existing = await getKeyMomentsJob(assetId, emailId);
  if (existing) return existing;

  return mux.robots.jobs.findKeyMoments.create(
    {
      passthrough: emailId,
      parameters: {
        asset_id: assetId,
        max_moments: 3,
        use_shots: true,
        output_steering: {
          rubric_priorities: ["novelty", "clarity_in_isolation"],
        },
      },
    },
    { idempotencyKey: `moments/${assetId}` },
  );
}

function getMomentScope(job: FindKeyMomentsJob) {
  const moment = job.outputs?.moments
    .filter(
      ({ start_ms, end_ms, overall_score }) =>
        Number.isFinite(start_ms) &&
        Number.isFinite(end_ms) &&
        Number.isFinite(overall_score) &&
        start_ms >= 0 &&
        end_ms - start_ms > SCOPE_END_INSET_MS,
    )
    .sort((left, right) => right.overall_score - left.overall_score)[0];

  return moment
    ? {
        start_time: moment.start_ms / 1000,
        end_time: (moment.end_ms - SCOPE_END_INSET_MS) / 1000,
      }
    : undefined;
}

async function startNote({
  assetId,
  emailId,
  screening,
  moments,
}: {
  assetId: string;
  emailId: string;
  screening: AskQuestionsJobOutputs;
  moments?: FindKeyMomentsJob;
}) {
  const mux = getMuxClient();
  const jobs = await getAskQuestionsJobs(assetId);
  const existing = findAskQuestionsJob(jobs, emailId, NOTE_QUESTION_COUNT);
  if (existing) return existing;

  const scope = moments ? getMomentScope(moments) : undefined;

  return mux.robots.jobs.askQuestions.create(
    {
      passthrough: emailId,
      parameters: {
        asset_id: assetId,
        questions: [
          {
            question: getNoteQuestion(screening),
            free_form_reply: true,
          },
        ],
        max_free_form_answer_length: 300,
        ...(scope && { output_steering: { scope } }),
      },
    },
    { idempotencyKey: `note/${assetId}` },
  );
}

/*
  Acts as a synchronization barrier for screening and key-moment runs. Whichever
  finishes last triggers the note pass, falling back to an unscoped query if moments fail.
*/
async function maybeStartNote({
  assetId,
  emailId,
  moments,
  screening,
}: {
  assetId: string;
  emailId: string;
  moments?: FindKeyMomentsJob;
  screening?: AskQuestionsJobOutputs;
}) {
  let screeningOutputs = screening;

  if (!screeningOutputs) {
    const screeningJob = await getScreeningJob(assetId, emailId);
    if (screeningJob?.status !== "completed" || !screeningJob.outputs) return;
    screeningOutputs = screeningJob.outputs;
  }

  let keyMoments = moments || (await getKeyMomentsJob(assetId, emailId));

  if (!keyMoments) {
    try {
      keyMoments = await startKeyMoments(assetId, emailId);
    } catch (error) {
      console.error("Mux key moments could not be started", error);

      await startNote({
        assetId,
        emailId,
        screening: screeningOutputs,
      });

      return;
    }
  }

  if (keyMoments.status === "pending" || keyMoments.status === "processing") {
    return;
  }

  await startNote({
    assetId,
    emailId,
    screening: screeningOutputs,
    moments: keyMoments.status === "completed" ? keyMoments : undefined,
  });
}

async function sendCitation({
  assetId,
  emailId,
  screening,
  note,
}: {
  assetId: string;
  emailId: string;
  screening: AskQuestionsJobOutputs;
  note?: AskQuestionsJobOutputs;
}) {
  await sendThreadedReply({
    emailId,
    kind: "citation",
    variables: getFestivalCitationVariables(screening, note),
  });

  await retainProcessedAsset(assetId, emailId);
}

async function prepareScreening({
  asset: webhookAsset,
  assetId,
  captionsSettled = false,
  emailId,
}: {
  asset?: WebhookAsset;
  assetId: string;
  captionsSettled?: boolean;
  emailId?: string;
}) {
  const mux = getMuxClient();

  const asset: Asset | WebhookAsset =
    webhookAsset || (await mux.video.assets.retrieve(assetId));

  if (asset.status !== "ready") return;
  const resolvedEmailId = emailId || asset.passthrough;
  if (!resolvedEmailId) return;

  if (!asset.tracks?.some((track) => track.type === "video")) {
    await rejectAndDeleteAsset({
      emailId: resolvedEmailId,
      reason: "unsupported_media",
      assetId,
    });

    return;
  }

  if (!captionsSettled) {
    const generatedCaptions = asset.tracks?.find(
      (track) => track.text_source === "generated_vod",
    );

    if (generatedCaptions?.status === "preparing") return;

    if (!generatedCaptions) {
      const audio = asset.tracks?.find((track) => track.type === "audio");
      if (audio?.status === "preparing") return;

      /*
        Robots need dialogue context to evaluate accurately. Captions are requested
        first, deferring screening until the `track.ready` webhook fires.
      */
      if (audio?.id && audio.status === "ready") {
        await mux.video.assets.generateSubtitles(
          assetId,
          audio.id,
          {
            generated_subtitles: [
              {
                language_code: "auto",
                name: GENERATED_CAPTION_NAME,
                passthrough: resolvedEmailId,
              },
            ],
          },
          { idempotencyKey: `captions/${assetId}` },
        );

        return;
      }
    }
  }

  const [screening, moments] = await Promise.allSettled([
    startScreening(assetId, resolvedEmailId),
    startKeyMoments(assetId, resolvedEmailId),
  ]);

  if (moments.status === "rejected") {
    console.error("Mux key moments could not be started", moments.reason);
  }

  if (screening.status === "rejected") {
    throw screening.reason;
  }
}

export async function POST(request: Request) {
  const payload = await request.text();
  let event;

  try {
    event = await getMuxClient().webhooks.unwrap(
      payload,
      request.headers,
      getMuxWebhookSecret(),
    );
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "video.asset.ready": {
        const { id: assetId, passthrough: emailId } = event.data;

        if (assetId) {
          await prepareScreening({
            asset: event.data,
            assetId,
            emailId,
          });
        }
        break;
      }

      case "video.asset.track.ready": {
        const {
          asset_id: assetId,
          passthrough: emailId,
          text_source,
        } = event.data;

        if (text_source === "generated_vod" && assetId) {
          await prepareScreening({
            assetId,
            captionsSettled: true,
            emailId,
          });
        }
        break;
      }

      case "robots.job.ask_questions.completed": {
        const {
          outputs,
          parameters: { asset_id: assetId },
          passthrough: emailId,
        } = event.data;

        const questionCount = event.data.parameters.questions.length;
        if (!emailId) break;

        if (questionCount === SCREENING_QUESTIONS.length) {
          if (outputs) {
            await maybeStartNote({
              assetId,
              emailId,
              screening: outputs,
            });
          } else {
            await rejectAndDeleteAsset({
              emailId,
              reason: "screening_failed",
              assetId,
            });
          }
        } else if (questionCount === NOTE_QUESTION_COUNT) {
          const screening = await getScreeningJob(assetId, emailId);

          if (screening?.status === "completed" && screening.outputs) {
            await sendCitation({
              assetId,
              emailId,
              screening: screening.outputs,
              note: outputs,
            });
          }
        } else if (questionCount === COMBINED_QUESTION_COUNT) {
          if (outputs) {
            const noteAnswer = outputs.answers[SCREENING_QUESTIONS.length];

            const noteOutputs = noteAnswer
              ? { answers: [noteAnswer] }
              : undefined;

            await sendCitation({
              assetId,
              emailId,
              screening: outputs,
              note: noteOutputs,
            });
          } else {
            await rejectAndDeleteAsset({
              emailId,
              reason: "screening_failed",
              assetId,
            });
          }
        }
        break;
      }

      case "robots.job.find_key_moments.completed":
      case "robots.job.find_key_moments.errored":
      case "robots.job.find_key_moments.cancelled": {
        const {
          parameters: { asset_id: assetId },
          passthrough: emailId,
        } = event.data;

        if (emailId) {
          await maybeStartNote({
            assetId,
            emailId,
            moments: event.data,
          });
        }
        break;
      }

      case "video.asset.errored": {
        await rejectAndDeleteAsset({
          emailId: event.data.passthrough,
          reason: "ingest_failed",
          assetId: event.data.id,
        });
        break;
      }

      case "video.asset.track.errored": {
        const {
          asset_id: assetId,
          passthrough: emailId,
          text_source,
        } = event.data;

        if (text_source === "generated_vod" && assetId) {
          await prepareScreening({
            assetId,
            captionsSettled: true,
            emailId,
          });
        }
        break;
      }

      case "robots.job.ask_questions.errored":
      case "robots.job.ask_questions.cancelled": {
        const {
          parameters: { asset_id: assetId, questions },
          passthrough: emailId,
        } = event.data;

        /*
          Treats note failure as non-fatal. Sends the citation from the completed
          screening output and lets the fallback note fill in.
        */
        if (questions.length === NOTE_QUESTION_COUNT && emailId) {
          const screening = await getScreeningJob(assetId, emailId);

          if (screening?.status === "completed" && screening.outputs) {
            await sendCitation({
              assetId,
              emailId,
              screening: screening.outputs,
            });
          }
        } else if (
          questions.length === SCREENING_QUESTIONS.length ||
          questions.length === COMBINED_QUESTION_COUNT
        ) {
          await rejectAndDeleteAsset({
            emailId,
            reason: "screening_failed",
            assetId,
          });
        }
        break;
      }
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Mux webhook processing failed for ${event.type}`, error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
