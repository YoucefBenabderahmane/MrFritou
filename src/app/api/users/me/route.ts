import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/users/me — get current user profile
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, username: true, email: true, role: true, authProvider: true, avatar: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Never expose actual password — just a presence flag so frontend can adapt UX
    const { password, ...safeUser } = user;
    return NextResponse.json({ ...safeUser, hasPassword: !!password });
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/users/me — update own username / password / avatar
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, password, currentPassword, avatar } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Password change logic:
    // - If user has an existing password, currentPassword is required
    // - If user is Google-only (no password), they can set a new password freely
    if (password) {
      if (user.password) {
        // Has existing password — require current password verification
        if (!currentPassword || user.password !== currentPassword) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
        }
      }
      // Google-only users can set password without verifying current password
      if (password.length < 4) {
        return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (username && username !== user.username) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
      updateData.username = username;
    }

    if (password) {
      updateData.password = password;
    }

    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: updateData,
      select: { id: true, username: true, email: true, role: true, authProvider: true, avatar: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/users/me error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
