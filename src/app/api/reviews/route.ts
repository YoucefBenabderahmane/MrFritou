import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reviews = await db.review.findMany({
      include: {
        menuItem: {
          select: {
            name: true,
            image: true,
            category: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
