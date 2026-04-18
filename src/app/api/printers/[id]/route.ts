import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH - update a printer
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const data = await req.json();
    const printer = await db.printer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.ip !== undefined && { ip: data.ip }),
        ...(data.usbLabel !== undefined && { usbLabel: data.usbLabel }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });
    return NextResponse.json(printer);
  } catch (error) {
    console.error("Failed to update printer:", error);
    return NextResponse.json({ error: "Failed to update printer" }, { status: 500 });
  }
}

// DELETE a printer
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.printer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete printer:", error);
    return NextResponse.json({ error: "Failed to delete printer" }, { status: 500 });
  }
}
