import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { lastLoginMethod } from "better-auth/plugins";
import { Resend } from "resend";
import ResetPasswordEmail from "@/components/emails/reset-password";
import VerifyEmail from "@/components/emails/verify-email";
import { db } from "@/db/drizzle";
import { schema } from "@/db/schema";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        react: ResetPasswordEmail({
          resetUrl: url,
          userEmail: user.email,
          username: user.name,
        }),
        subject: "Reset your password",
        to: user.email,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        react: VerifyEmail({ username: user.name, verifyUrl: url }),
        subject: "Verify your email",
        to: user.email,
      });
    },
  },
  plugins: [lastLoginMethod(), nextCookies()],
  user: {
    deleteUser: {
      enabled: true,
    },
  },
});
