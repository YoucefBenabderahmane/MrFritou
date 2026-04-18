import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const worker = await db.worker.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone,
        email: data.email,
        salary: data.salary,
        paymentType: data.paymentType,
        status: data.status,
      }
    });
    return NextResponse.json(worker);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.worker.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 });
  }
}
