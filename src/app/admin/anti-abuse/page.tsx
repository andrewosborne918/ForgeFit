'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SoftDeletedUser {
  id: string;
  email: string;
  status: string;
  [key: string]: any;
}

export default function AntiAbusePage() {
  const [users, setUsers] = useState<SoftDeletedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null); // To track which user action is submitting

  const fetchSoftDeletedUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/soft-deleted-users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSoftDeletedUsers();
  }, []);

  const handleReactivate = async (userId: string) => {
    setIsSubmitting(userId);
    setActionError(null);
    try {
      const response = await fetch('/api/admin/reactivate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to reactivate user');
      }
      // Refresh the list after successful action
      fetchSoftDeletedUsers();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handlePermanentDelete = async (userId: string) => {
    setIsSubmitting(userId);
    setActionError(null);
    try {
      const response = await fetch('/api/admin/permanently-delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to delete user');
      }
      // Refresh the list after successful action
      fetchSoftDeletedUsers();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Anti-Abuse Admin Panel</h1>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl">Soft-Deleted Users</h2>
        <Button onClick={fetchSoftDeletedUsers} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      {error && <p className="text-red-500">Error: {error}</p>}
      {actionError && <p className="text-red-500 mt-2">Action Error: {actionError}</p>}
      {isLoading ? (
        <p>Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">User ID</th>
                <th className="py-2 px-4 border-b">Email</th>
                <th className="py-2 px-4 border-b">Status</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id}>
                    <td className="py-2 px-4 border-b">{user.id}</td>
                    <td className="py-2 px-4 border-b">{user.email}</td>
                    <td className="py-2 px-4 border-b">{user.status}</td>
                    <td className="py-2 px-4 border-b">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivate(user.id)}
                        disabled={isSubmitting === user.id}
                        className="mr-2"
                      >
                        {isSubmitting === user.id ? 'Reactivating...' : 'Reactivate'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isSubmitting === user.id}
                          >
                            {isSubmitting === user.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the user account and all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handlePermanentDelete(user.id)}>
                              Yes, delete permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 px-4 text-center">No soft-deleted users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
