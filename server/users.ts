"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(1, "Username is required").max(100),
});

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return { message: "Signed in successfully.", success: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Sign in failed.",
      success: false,
    };
  }
};

export const signUp = async (
  email: string,
  password: string,
  username: string
) => {
  try {
    const parsed = signUpSchema.safeParse({ email, password, username });
    if (!parsed.success) {
      return {
        message: parsed.error.issues.map((e) => e.message).join(", "),
        success: false,
      };
    }

    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        name: parsed.data.username,
        password: parsed.data.password,
      },
    });
    return { message: "Account created.", success: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Sign up failed.",
      success: false,
    };
  }
};
