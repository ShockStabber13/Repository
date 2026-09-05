import { signOut } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  if (process.env.HACKERAI_LOCAL_AUTH === "1") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return signOut();
};
