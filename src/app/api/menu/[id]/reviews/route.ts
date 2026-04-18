import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reviews = await db.review.findMany({
      where: { menuItemId: id },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    
    // Create new review
    const review = await db.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        authorName: data.authorName,
        menuItemId: id,
      }
    });

    // Calculate new average rating
    const allReviews = await db.review.findMany({
      where: { menuItemId: id },
      select: { rating: true }
    });
    
    const avgRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;

    // Update the menu item
    await db.menuItem.update({
      where: { id },
      data: {
        rating: avgRating
      }
    });

    return NextResponse.json(review);
  } catch (error) {
    return NextResponse.json({ error: "Failed to add review" }, { status: 500 });
  }
}
