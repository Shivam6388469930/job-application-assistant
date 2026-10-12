import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { JobRecommendation } from "@/models/JobRecommendation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { recommendationId, status } = await request.json();

    if (!recommendationId || !status) {
      return NextResponse.json(
        { success: false, error: "recommendationId and status are required" },
        { status: 400 }
      );
    }

    const updateFields: any = { status };
    const now = new Date();

    if (status === "VIEWED") updateFields.viewedAt = now;
    if (status === "APPLIED") updateFields.appliedAt = now;
    if (status === "DISMISSED") updateFields.dismissedAt = now;

    const updated = await JobRecommendation.findByIdAndUpdate(
      recommendationId,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Recommendation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendation: updated,
    });
  } catch (error) {
    console.error("POST /api/jobs/status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update recommendation status" },
      { status: 500 }
    );
  }
}
