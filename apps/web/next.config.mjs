const staticSite = process.env.NEXT_PUBLIC_STATIC_SITE === "1";
export default {
  ...(staticSite ? { output: "export", trailingSlash: true, images: { unoptimized: true }, basePath: process.env.BASE_PATH ?? "" } : {}),
  transpilePackages: ["@toolhub/registry", "@toolhub/server-common", "@toolhub/db"],
  serverExternalPackages: ["bullmq", "ioredis", "@prisma/client", "nodemailer"],
};
