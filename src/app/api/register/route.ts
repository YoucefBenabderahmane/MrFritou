import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { signToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

// GET /api/register → check if first-run setup is possible
export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ canRegister: count === 0 });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// POST /api/register → create the first admin (only when DB is empty)
export async function POST(req: Request) {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json(
        { error: "Setup already complete. Contact your administrator." },
        { status: 403 }
      );
    }

    const { username, email, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
    }

    const admin = await prisma.user.create({
      data: {
        username,
        email: email || null,
        password,
        role: "admin",
        authProvider: "local",
      },
    });

    // Immediately log them in
    const token = signToken({ id: admin.id, username: admin.username, email: admin.email ?? undefined, role: admin.role });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ id: admin.id, username: admin.username, email: admin.email, role: admin.role });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
