import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    if (body.action === 'status') {
      const updated = await db.order.update({
        where: { id },
        data: { status: body.status },
        include: { items: true }
      });
      return NextResponse.json(updated);
    }

    if (body.action === 'updateQuantity') {
      await db.orderItem.update({
        where: { id: body.itemId },
        data: { quantity: body.quantity }
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'removeItem') {
      await db.orderItem.delete({
        where: { id: body.itemId }
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'addItem') {
      const { name, price, quantity, note } = body.item;
      await db.orderItem.create({
        data: {
          name, price, quantity, note, orderId: id
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.order.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
