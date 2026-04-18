import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "month"; // day, week, month, year
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

    // 1. Fetch Orders (Revenue from sales)
    const orders = await db.order.findMany({
      where: {
        time: { gte: start, lte: end },
        status: { not: "cancelled" }
      },
      include: { items: true }
    });

    // 2. Fetch Transactions (Other income / Expenses)
    const transactions = await db.finTransaction.findMany({
      where: {
        date: { gte: start, lte: end }
      }
    });

    // Calculate Totals
    let revenueFromOrders = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        revenueFromOrders += item.price * item.quantity;
      });
    });

    let otherIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
      if (t.type === "income") {
        otherIncome += t.amount;
      } else if (t.type === "expense") {
        totalExpenses += t.amount;
      }
    });

    const totalRevenue = revenueFromOrders + otherIncome;
    const pureProfit = totalRevenue - totalExpenses;

    // Generate Chart Data
    let chartData: any[] = [];

    if (range === "day") {
      // Return hourly breakdown if needed, but for now just summary is enough.
      // Let's provide 4-6 hour blocks or just the day.
      chartData = [{ label: format(now, "MMM dd"), revenue: totalRevenue, expense: totalExpenses }];
    } else if (range === "week" || range === "month") {
      // Daily breakdown
      const days = eachDayOfInterval({ start, end });
      chartData = days.map(day => {
        let rev = 0;
        let exp = 0;

        orders.forEach(o => {
          if (isSameDay(new Date(o.time), day)) {
            o.items.forEach(i => rev += i.price * i.quantity);
          }
        });

        transactions.forEach(t => {
          if (isSameDay(new Date(t.date), day)) {
            if (t.type === "income") rev += t.amount;
            else if (t.type === "expense") exp += t.amount;
          }
        });

        return {
          label: format(day, "MMM dd"),
          revenue: rev,
          expense: exp
        };
      });
    } else if (range === "year") {
      // Monthly breakdown
      const months = eachMonthOfInterval({ start, end });
      chartData = months.map(m => {
        let rev = 0;
        let exp = 0;

        orders.forEach(o => {
          if (isSameMonth(new Date(o.time), m)) {
            o.items.forEach(i => rev += i.price * i.quantity);
          }
        });

        transactions.forEach(t => {
          if (isSameMonth(new Date(t.date), m)) {
            if (t.type === "income") rev += t.amount;
            else if (t.type === "expense") exp += t.amount;
          }
        });

        return {
          label: format(m, "MMM"),
          revenue: rev,
          expense: exp
        };
      });
    }

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpenses,
        pureProfit,
        orderCount: orders.length,
        revenueFromOrders,
        otherIncome
      },
      chartData
    });

  } catch (error) {
    console.error("Reports Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
