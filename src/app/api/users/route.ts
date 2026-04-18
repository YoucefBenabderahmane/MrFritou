import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Never return passwords, even hashed ones if we had them!
    const sanitized = users.map(u => ({ id: u.id, username: u.username, role: u.role, email: u.email, createdAt: u.createdAt }));
    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, role, email } = body;
    
    if (!email) {
      return NextResponse.json({ error: "Email is required for Google Login" }, { status: 400 });
    }
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password, // Hardcoded plain text for simplicity per MVP
        role: role || "manager",
      },
    });
    
    return NextResponse.json({ id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
