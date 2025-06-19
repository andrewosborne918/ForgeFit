
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAppContext } from "@/context/AppContext";

export default function AccountDeletion() {
  const { user } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSoftDelete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/soft-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.uid }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "An unexpected error occurred.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-4 border-l-4 border-green-500 bg-green-50">
        <p className="font-semibold">Account Deactivated</p>
        <p>Your account has been successfully deactivated. We hope to see you again soon.</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Deactivate Account</h3>
      <p className="text-sm text-gray-600 mb-4">
        This will deactivate your account, but your workout history and generation count will be preserved. If you sign up again with the same email, your account will be reactivated.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Deactivating..." : "Deactivate Account"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will deactivate your account. You can reactivate it by signing up again with the same email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
}
