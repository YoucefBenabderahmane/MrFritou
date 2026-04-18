import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const review = await db.review.findUnique({
      where: { id }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const menuItemId = review.menuItemId;

    // Delete review
    await db.review.delete({
      where: { id }
    });

    // Recalculate average rating for the given product
    const allReviews = await db.review.findMany({
      where: { menuItemId },
      select: { rating: true }
    });
    
    let avgRating = 0;
    if (allReviews.length > 0) {
      avgRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;
    }

    // Update the menu item rating
    await db.menuItem.update({
      where: { id: menuItemId },
      data: { rating: avgRating }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const review = await db.review.update({
      where: { id },
      data: {
        adminReply: body.adminReply
      }
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error("Failed to update review:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
