import { NextRequest, NextResponse } from "next/server";
import { getAdminDB, getAdminAuth, initializeAdminApp } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  initializeAdminApp();
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "User ID is required." }, { status: 400 });
  }

  try {
    const db = getAdminDB();
    const auth = getAdminAuth();

    if (!db || !auth) {
      throw new Error("Firebase Admin SDK not initialized.");
    }

    // 1. Disable user in Firebase Auth
    await auth.updateUser(userId, { disabled: true });

    // 2. Mark user as soft-deleted in Firestore
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      status: "soft-deleted",
      deletedAt: new Date(),
    });

    return NextResponse.json({ message: "Account successfully deactivated." });

  } catch (error: any) {
    console.error("Error deactivating account:", error);
    return NextResponse.json({ error: error.message || "An internal error occurred." }, { status: 500 });
  }
}
