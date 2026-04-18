import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { signToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // Check if there are any users in the DB
    const userCount = await prisma.user.count();

    // First time setup - auto create admin if none exist
    if (userCount === 0) {
      if (username === "admin" && password === "admin") {
        const adminUser = await prisma.user.create({
          data: { username, password, role: "admin" }
        });
        const token = signToken({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
          sameSite: "lax",
        });
        return NextResponse.json({ id: adminUser.id, username: adminUser.username, role: adminUser.role });
      } else {
        return NextResponse.json({ error: "No users found. Login as admin/admin to initialize." }, { status: 401 });
      }
    }

    // Attempt to login using DB records
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.password || user.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Issue session cookie
    const token = signToken({ id: user.id, username: user.username, email: user.email ?? undefined, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
