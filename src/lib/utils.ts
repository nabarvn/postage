export { cn } from "cn";
import { Metadata } from "next";
import { config } from "@/lib/config";

export function constructMetadata({
  title = `${config.app.name} - Email a film. The jury writes back.`,
  description = `${config.app.name} accepts one public video URL by email. Mux Robots screens the footage and the jury replies in the same thread with an official citation.`,
  image = "/thumbnail.png",
  icons = [
    {
      rel: "icon",
      url: "/favicon.ico", // for standard browsers
    },
    {
      rel: "apple-touch-icon",
      url: "/logo.png", // for Apple devices
    },
  ],
  noIndex = false, // allow search engine bots to crawl and index the website
}: {
  title?: string;
  description?: string;
  image?: string;
  icons?: Metadata["icons"];
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@nabarvn",
    },
    icons,
    metadataBase: new URL(config.app.url),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
