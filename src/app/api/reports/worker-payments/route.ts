import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "month";
    const now = new Date();

    let start: Date;
    let end: Date;

    if (range === "day") {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (range === "week") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (range === "month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (range === "year") {
      start = startOfYear(now);
      end = endOfYear(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    // Fetch all worker payments in that range with worker details
    const payments = await db.workerPayment.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            role: true,
            paymentType: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Summary per worker
    const workerMap: Record<
      string,
      {
        workerId: string;
        workerName: string;
        workerRole: string;
        paymentType: string;
        totalPaid: number;
        paymentCount: number;
      }
    > = {};

    payments.forEach((p) => {
      if (!workerMap[p.workerId]) {
        workerMap[p.workerId] = {
          workerId: p.workerId,
          workerName: p.worker.name,
          workerRole: p.worker.role,
          paymentType: p.worker.paymentType,
          totalPaid: 0,
          paymentCount: 0,
        };
      }
      workerMap[p.workerId].totalPaid += p.amount;
      workerMap[p.workerId].paymentCount += 1;
    });

    const workerSummaries = Object.values(workerMap).sort(
      (a, b) => b.totalPaid - a.totalPaid
    );
    const grandTotal = payments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentType: p.paymentType,
        note: p.note,
        date: p.date,
        workerName: p.worker.name,
        workerRole: p.worker.role,
        workerId: p.workerId,
      })),
      workerSummaries,
      grandTotal,
      totalPayments: payments.length,
    });
  } catch (error) {
    console.error("Worker Payments Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch worker payments" },
      { status: 500 }
    );
  }
}
