import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { redirectToAuthorizationUrl } from "@/lib/auth/auth-redirect-intents";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.HACKERAI_LOCAL_AUTH === "1") {
    return NextResponse.redirect(new URL("/", url));
  }
  const authorizationUrl = await getSignInUrl();
  return redirectToAuthorizationUrl(authorizationUrl, url);
}
