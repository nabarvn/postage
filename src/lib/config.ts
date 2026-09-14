function fromEnv(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

const resendReceivingAddress = fromEnv(
  process.env.NEXT_PUBLIC_RESEND_RECEIVING_ADDRESS,
  "your-app-name@your-subdomain.resend.app",
);

const customReceivingAddress = fromEnv(
  process.env.NEXT_PUBLIC_CUSTOM_RECEIVING_ADDRESS,
  "jury@your-domain.com",
);

export const config = {
  app: {
    name: "Postage",
    wordmark: "POSTAGE",
    url: "https://postage.nabarun.app",
  },
  submissionsOpen:
    process.env.SUBMISSIONS_OPEN?.trim().toLowerCase() !== "false",
  receivingAddresses: [
    { address: resendReceivingAddress, name: "Resend receiving address" },
    { address: customReceivingAddress, name: "Custom receiving address" },
  ],
  links: {
    hackathon: "https://bestreplywins.vercel.app",
    muxRobots: "https://mux.com/docs/guides/robots",
    resendInbound: "https://resend.com/features/inbound",
    repository: "https://git.new/reply",
  },
};
