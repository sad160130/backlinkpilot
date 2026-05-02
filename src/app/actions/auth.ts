"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "blp_session";
const COOKIE_VALUE = "authenticated";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function login(formData: FormData) {
  const password = formData.get("password");
  const expected = process.env.APP_PASSWORD ?? "";

  if (typeof password !== "string" || expected === "" || password !== expected) {
    redirect("/login?error=invalid");
  }

  cookies().set({
    name: COOKIE_NAME,
    value: COOKIE_VALUE,
    httpOnly: true,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/pipeline");
}

export async function logout() {
  cookies().delete(COOKIE_NAME);
  redirect("/login");
}
