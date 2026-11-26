import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/db";

type Provider = { clientId: string; clientSecret: string };

const provider = (
  clientId?: string,
  clientSecret?: string,
): Provider | undefined =>
  clientId && clientSecret ? { clientId, clientSecret } : undefined;

const github = provider(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);

/** Providers the login page should offer. */
export const enabledProviders = {
  github: Boolean(github),
  // Email and password exist only so the app can be tried locally without OAuth keys.
  password: import.meta.env.DEV,
};

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: import.meta.env.DEV },
  socialProviders: { ...(github && { github }) },
});
