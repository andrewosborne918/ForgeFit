import { getAdminDB } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-auth";

// Get all users - admin only endpoint
export async function GET(request: Request) {
  try {
    // Extract the admin email from the request header
    const adminEmail = request.headers.get("x-admin-email");
    
    // Verify the admin email
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Get all users from Firestore
    const db = getAdminDB();
    
    if (!db) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const usersSnapshot = await db.collection("users").get();
    
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Add, update, or delete user - admin only endpoints
export async function POST(request: Request) {
  try {
    // Extract the admin email from the request header
    const adminEmail = request.headers.get("x-admin-email");
    
    // Verify the admin email
    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { action, userId, userData } = await request.json();

    // Get Firestore admin
    const db = getAdminDB();
    
    if (!db) {
      console.error('Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    if (action === "update" && userId && userData) {
      // Update user data
      await db.collection("users").doc(userId).update(userData);
      return NextResponse.json({ message: "User updated successfully" });
    }
    
    if (action === "delete" && userId) {
      // Delete user data
      await db.collection("users").doc(userId).delete();
      return NextResponse.json({ message: "User deleted successfully" });
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing user request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}