import { NextRequest, NextResponse } from "next/server";
import { getAdminDB, getAdminAuth, initializeAdminApp } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface UserData {
    status?: string;
}

export async function POST(req: NextRequest) {
  initializeAdminApp();
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const db = getAdminDB();
    const auth = getAdminAuth();

    if (!db || !auth) {
      throw new Error("Firebase Admin SDK not initialized.");
    }

    const usersRef = db.collection("users");
    const querySnapshot = await usersRef.where("email", "==", email).get();

    if (querySnapshot.empty) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    let userReactivated = false;
    const batch = db.batch();

    for (const doc of querySnapshot.docs) {
      const user = doc.data() as UserData;
      if (user.status === "soft-deleted") {
        await auth.updateUser(doc.id, { disabled: false });

        batch.update(doc.ref, { status: "active", deletedAt: FieldValue.delete() });
        userReactivated = true;
        break;
      }
    }

    if (userReactivated) {
      await batch.commit();
      return NextResponse.json({ message: "Account successfully reactivated." });
    } else {
      return NextResponse.json({ message: "User is not deactivated." }, { status: 409 });
    }

  } catch (error: any) {
    console.error("Error reactivating account:", error);
    return NextResponse.json({ error: error.message || "An internal error occurred." }, { status: 500 });
  }
}
