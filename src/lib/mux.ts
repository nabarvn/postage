import "server-only";

import Mux from "@mux/mux-node";
import { requiredEnv } from "@/lib/env";

let client: Mux | undefined;

export function getMuxClient() {
  client ??= new Mux({
    tokenId: requiredEnv("MUX_TOKEN_ID"),
    tokenSecret: requiredEnv("MUX_TOKEN_SECRET"),
  });

  return client;
}

export function getMuxWebhookSecret() {
  return requiredEnv("MUX_WEBHOOK_SECRET");
}
