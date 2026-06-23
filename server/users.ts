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
    return { success: true, message: "Signed in successfully." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Sign in failed.",
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
        success: false,
        message: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.username,
      },
    });
    return { success: true, message: "Account created." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Sign up failed.",
    };
  }
};
