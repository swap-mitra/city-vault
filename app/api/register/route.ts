import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  consumeRateLimit,
  createRateLimitResponse,
  getRequestIdentity,
} from "@/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const registerRateLimit = {
  bucket: "register",
  max: 5,
  windowMs: 15 * 60 * 1000,
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedName =
      typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
    const rateLimit = consumeRateLimit({
      ...registerRateLimit,
      key: `${getRequestIdentity(request)}:${normalizedEmail || "unknown-email"}`,
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(
        rateLimit,
        "Too many registration attempts. Try again in a few minutes."
      );
    }

    if (!emailPattern.test(normalizedEmail) || password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Provide a valid email and a password with at least 8 characters",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: { name: trimmedName, email: normalizedEmail, passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}