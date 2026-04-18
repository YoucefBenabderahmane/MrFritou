import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payments = await db.workerPayment.findMany({
      where: { workerId: id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch worker payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const payment = await db.workerPayment.create({
      data: {
        amount: data.amount,
        paymentType: data.paymentType,
        note: data.note || null,
        workerId: id,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Worker payment error:", error);
    return NextResponse.json(
      { error: "Failed to create worker payment" },
      { status: 500 }
    );
  }
}
