import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await db.order.findMany({
      include: {
        items: true
      },
      orderBy: {
        time: 'desc'
      }
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderNum, table, type, status, items, customerName, customerPhone } = body;
    
    if (!items || !Array.isArray(items)) {
       return NextResponse.json({ error: "Missing items in order" }, { status: 400 });
    }
    
    // Calculate daily order number (e.g. 26-03-2026-0001)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const todayOrderCount = await db.order.count({
      where: {
        time: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });
    
    // Format DD-MM-YYYY
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    const sequence = String(todayOrderCount + 1).padStart(4, '0');
    const generatedOrderNum = `${d}-${m}-${y}-${sequence}`;
    
    const newOrder = await db.order.create({
      data: {
        orderNum: generatedOrderNum,
        table,
        type,
        status,
        customerName,
        customerPhone,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            note: item.note
          }))
        }
      },
      include: {
        items: true
      }
    });
    
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
