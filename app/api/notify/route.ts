import { NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(req: Request) {
  const { phone, name } = await req.json();

  try {
    await client.messages.create({
      body: `Olá ${name}! 🎉 Seja bem-vindo! Seu cadastro foi realizado com sucesso no nosso dashboard.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone, // ex: +5511976103608
    });

    return NextResponse.json({ success: true, message: "SMS enviado!" });
  } catch (error) {
    console.error("Erro ao enviar SMS:", error);
    return NextResponse.json(
      { success: false, message: "Erro ao enviar SMS" },
      { status: 500 }
    );
  }
}
