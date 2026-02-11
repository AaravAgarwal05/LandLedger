import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Land } from "@/models/Land";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    await dbConnect();
    const { tokenId } = await params;

    const land = await Land.findOne({ tokenId: tokenId }).lean();

    if (!land) {
      return NextResponse.json(
        { success: false, error: "NFT not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      land,
    });
  } catch (error) {
    console.error("Error fetching NFT:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
