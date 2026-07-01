import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← service role para operações admin
  {
    db: { schema: "public" },
    global: {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  }
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { plan } = await request.json();

  const { error } = await supabase
    .from("users")
    .update({ plan })
    .eq("id", id); // ← id, não params.id

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
