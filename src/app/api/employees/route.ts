import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workers = await db.worker.findMany({
      orderBy: { name: "asc" }
    });
    return NextResponse.json(workers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const worker = await db.worker.create({
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
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}
