import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

// GET the restaurant settings (create default if none exist)
export async function GET() {
  try {
    let settings = await db.restaurantSettings.findFirst();
    
    if (!settings) {
      settings = await db.restaurantSettings.create({
        data: {
          name: "My Restaurant",
          currency: "$",
          address: "",
          tablesCount: 15,
          language: "en",
          theme: "orange",
        }
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PATCH to update settings
export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    
    let settings = await db.restaurantSettings.findFirst();
    
    if (!settings) {
      settings = await db.restaurantSettings.create({
        data: {
          name: data.name || "My Restaurant",
          currency: data.currency || "$",
          address: data.address || "",
          logo: data.logo || null,
          tablesCount: data.tablesCount || 15,
          language: data.language || "en",
          theme: data.theme || "orange",
        }
      });
    } else {
      settings = await db.restaurantSettings.update({
        where: { id: settings.id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.currency !== undefined && { currency: data.currency }),
          ...(data.address !== undefined && { address: data.address }),
           ...(data.logo !== undefined && { logo: data.logo }),
           ...(data.tablesCount !== undefined && { tablesCount: data.tablesCount }),
           ...(data.language !== undefined && { language: data.language }),
           ...(data.theme !== undefined && { theme: data.theme }),
        }
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
