import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await db.menuItem.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const item = await db.menuItem.create({
      data: {
        name: data.name,
        price: data.price,
        category: data.category,
        stock: data.stock,
        image: data.image,
        status: data.status,
        description: data.description,
        rating: data.rating,
      }
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}
