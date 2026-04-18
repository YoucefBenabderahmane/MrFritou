import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all printers
export async function GET() {
  try {
    const printers = await db.printer.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(printers);
  } catch (error) {
    console.error("Failed to fetch printers:", error);
    return NextResponse.json({ error: "Failed to fetch printers" }, { status: 500 });
  }
}

// POST - create a new printer
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const printer = await db.printer.create({
      data: {
        name: data.name || "New Printer",
        type: data.type || "kitchen",
        ip: data.ip || null,
        usbLabel: data.usbLabel || null,
        isDefault: data.isDefault ?? false,
      },
    });
    return NextResponse.json(printer);
  } catch (error) {
    console.error("Failed to create printer:", error);
    return NextResponse.json({ error: "Failed to create printer" }, { status: 500 });
  }
}
