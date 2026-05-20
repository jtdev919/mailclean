import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getTopSenders,
  getCategoryMessages,
  deleteMessages,
} from "@/lib/gmail";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action");

  if (action === "senders") {
    const senders = await getTopSenders(session.accessToken);
    return NextResponse.json(senders);
  }

  if (action === "categories") {
    const categories = await getCategoryMessages(session.accessToken);
    return NextResponse.json(categories);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messageIds } = await req.json();

  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json(
      { error: "No message IDs provided" },
      { status: 400 }
    );
  }

  const result = await deleteMessages(session.accessToken, messageIds);
  return NextResponse.json(result);
}
