import "server-only";

import { isIP } from "node:net";

const HTML_REPLY_HISTORY = /<blockquote\b/i;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[),.;:!?\]}]+$/;
const DIRECT_AUDIO_PATH = /\.(?:aac|m4a|mp3|ogg|wav)$/i;
const HREF_URL = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
const DIRECT_VIDEO_PATH = /\.(?:m4v|mkv|mov|mp4|ts|webm)$/i;

const TEXT_REPLY_HISTORY =
  /^(?:\s*>|\s*On .+ wrote:\s*$|\s*-{2,}\s*Original Message\s*-{2,}\s*$)/im;

export type MediaUrlResult =
  | { status: "found"; url: string }
  | { status: "missing" | "ambiguous" | "unsupported" };

type MediaCandidate =
  | {
      status: "candidate";
      rank: number;
      url: string;
    }
  | { status: "unsupported" };

/*
  Best-effort filtering of literal private and loopback addresses.
  Mux remains responsible for validating DNS resolution and redirects when fetching.
*/
function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost")) {
    return true;
  }

  const version = isIP(host);

  if (version === 6) {
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("::ffff:") ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb")
    );
  }

  if (version !== 4) {
    return false;
  }

  const [first, second] = host.split(".").map(Number);

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function normalizeCandidate(candidate: string): MediaCandidate | null {
  const decoded = candidate
    .replace(/&amp;/gi, "&")
    .replace(TRAILING_PUNCTUATION, "");

  try {
    const url = new URL(decoded);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      isPrivateHost(url.hostname)
    ) {
      return null;
    }

    url.hash = "";

    if (DIRECT_AUDIO_PATH.test(url.pathname)) {
      return { status: "unsupported" };
    }

    const isDirectVideo = DIRECT_VIDEO_PATH.test(url.pathname);
    const isGoogleDrive = url.hostname === "drive.google.com";

    const isDropbox =
      url.hostname === "dropbox.com" ||
      url.hostname === "www.dropbox.com" ||
      url.hostname === "dl.dropboxusercontent.com";

    if (isGoogleDrive) {
      const fileMatch = url.pathname.match(/^\/file\/d\/([^/]+)/);
      const fileId = fileMatch?.[1] || url.searchParams.get("id");
      if (!fileId) return null;

      const direct = new URL("https://drive.google.com/uc");

      direct.searchParams.set("id", fileId);
      return { status: "candidate", rank: 2, url: direct.toString() };
    }

    if (isDropbox) {
      url.searchParams.delete("dl");
      url.searchParams.set("raw", "1");
    }

    return {
      status: "candidate",
      rank: isDirectVideo ? 3 : isDropbox ? 2 : 1,
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

function candidates(source?: string | null) {
  return source?.match(URL_PATTERN) ?? [];
}

function hrefSource(html?: string | null) {
  if (!html) return undefined;
  const urls = Array.from(html.matchAll(HREF_URL), (match) => match[1]);
  return urls.length > 0 ? urls.join("\n") : undefined;
}

/*
  Truncates reply history to ignore links from prior turns
*/
function beforeReplyHistory(marker: RegExp, source?: string | null) {
  if (!source) return source;
  const history = source.search(marker);
  return history === -1 ? source : source.slice(0, history);
}

function selectCandidate(source?: string | null): MediaUrlResult {
  const rankedUrls = new Map<string, number>();
  let hasAudio = false;

  for (const candidate of candidates(source)) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) continue;

    if (normalized.status === "unsupported") {
      hasAudio = true;
      continue;
    }

    rankedUrls.set(
      normalized.url,
      Math.max(rankedUrls.get(normalized.url) ?? 0, normalized.rank),
    );
  }

  if (rankedUrls.size === 0) {
    return { status: hasAudio ? "unsupported" : "missing" };
  }

  const highestRank = Math.max(...rankedUrls.values());

  const strongestCandidates = [...rankedUrls].filter(
    ([, rank]) => rank === highestRank,
  );

  if (strongestCandidates.length !== 1) return { status: "ambiguous" };
  return { status: "found", url: strongestCandidates[0][0] };
}

export function extractMediaUrl(text?: string | null, html?: string | null) {
  const textResult = selectCandidate(
    beforeReplyHistory(TEXT_REPLY_HISTORY, text),
  );

  if (textResult.status === "found") return textResult;
  const currentHtml = beforeReplyHistory(HTML_REPLY_HISTORY, html);
  const hrefs = hrefSource(currentHtml);

  if (hrefs) {
    const hrefResult = selectCandidate(hrefs);
    if (hrefResult.status !== "missing") return hrefResult;
  }

  if (textResult.status !== "missing") return textResult;
  return selectCandidate(currentHtml);
}
