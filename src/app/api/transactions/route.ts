import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const transactions = await db.finTransaction.findMany({
      orderBy: { date: "desc" }
    });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const transaction = await db.finTransaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description,
        category: data.category,
      }
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Transaction Error:", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}
