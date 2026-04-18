import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const host = req.headers.get("host") || reqUrl.host;
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const appUrl = `${protocol}://${host}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    const code = reqUrl.searchParams.get("code");
    const error = reqUrl.searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(`${appUrl}/admin/login?error=google_cancelled`);
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange failed:", errText);
      let errMsg = "Token exchange failed";
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error_description || errJson.error || errText;
      } catch (e) {
        errMsg = errText;
      }
      return NextResponse.redirect(`${appUrl}/admin/login?error=google_failed&error_desc=${encodeURIComponent(errMsg)}`);
    }

    const { access_token } = await tokenRes.json();

    // 2. Get user info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${appUrl}/admin/login?error=google_failed&error_desc=${encodeURIComponent("User fetching error")}`);
    }

    const googleUser = await userRes.json();
    const { email, name, sub: googleId } = googleUser;

    if (!email) {
      return NextResponse.redirect(`${appUrl}/admin/login?error=no_email`);
    }

    // 3. Find or bootstrap the user
    // Check total user count for first-run bootstrap
    const userCount = await (db as any).user.count();

    let user = await (db as any).user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email.toLowerCase() },
        ],
      },
    });

    if (!user) {
      if (userCount === 0) {
        // First-run: make this Google user the primary admin
        user = await (db as any).user.create({
          data: {
            username: name || email.split("@")[0],
            email: email.toLowerCase(),
            googleId,
            authProvider: "google",
            role: "admin",
          },
        });
      } else {
        // Not pre-authorized — reject
        return NextResponse.redirect(`${appUrl}/admin/login?error=not_authorized`);
      }
    } else if (!user.googleId) {
      // Link Google account to existing user
      user = await (db as any).user.update({
        where: { id: user.id },
        data: { googleId, authProvider: "google", email: email.toLowerCase() },
      });
    }

    // 4. Issue JWT session cookie
    const token = signToken({
      id: user.id,
      username: user.username,
      email: user.email ?? email,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: appUrl.startsWith("https"),
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.redirect(`${appUrl}/admin/dashboard`);
  } catch (err: any) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(`${appUrl}/admin/login?error=google_failed&error_desc=${encodeURIComponent(err.message || "Unknown catch error")}`);
  }
}
