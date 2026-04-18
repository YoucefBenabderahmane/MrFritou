import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export async function DELETE(req: Request, context: any) {
  try {
    const id = context.params?.id || context.params;
    await prisma.user.delete({
      where: { id: id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const id = context.params?.id || context.params;
    const { username, password, role } = await req.json();
    
    const updateData: any = {};
    if (username) updateData.username = username;
    if (password) updateData.password = password; // Warning: clear text password
    if (role) updateData.role = role;

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: updateData,
    });
    return NextResponse.json({ id: updatedUser.id, username: updatedUser.username, role: updatedUser.role });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
