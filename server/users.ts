"use server";

import { auth } from "@/lib/auth";
import { requireSession } from "./session";

export const getCurrentUser = async () => {
  const { session, currentUser } = await requireSession();
  return { ...session, currentUser };
};

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
    await auth.api.signUpEmail({ body: { email, password, name: username } });
    return { success: true, message: "Account created." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Sign up failed.",
    };
  }
};
