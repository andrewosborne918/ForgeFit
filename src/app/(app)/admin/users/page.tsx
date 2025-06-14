'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { isAdminEmail } from '@/lib/admin-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Key, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    plan?: string;
    workoutsGenerated?: number;
    workoutsRemaining?: number;
  };
  subscription?: {
    status?: string;
    planId?: string;
    currentPeriodEnd?: string;
  };
}

interface UserFilters {
  search: string;
  sortBy: 'createdAt' | 'email';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export default function AdminUsersPage() {
  const { user } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  // Check admin access
  useEffect(() => {
    if (!user || !user.email || !isAdminEmail(user.email)) {
      window.location.href = '/';
      return;
    }
  }, [user]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!user?.email) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        adminEmail: user.email
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.users);
      setTotalUsers(data.total);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [user?.email, filters]);

  useEffect(() => {
    if (user && user.email && isAdminEmail(user.email)) {
      fetchUsers();
    }
  }, [user, filters, fetchUsers]);

  // Update subscription
  const updateSubscription = async (userId: string, plan: string) => {
    setActionLoading(`subscription-${userId}`);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSubscription',
          userId,
          plan,
          userEmail: user?.email || ''
        })
      });

      if (!response.ok) throw new Error('Failed to update subscription');
      
      toast.success('Subscription updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    } finally {
      setActionLoading(null);
    }
  };

  // Reset password
  const resetPassword = async (userId: string, email: string) => {
    setActionLoading(`password-${userId}`);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          userId,
          email,
          userEmail: user?.email || ''
        })
      });

      if (!response.ok) throw new Error('Failed to reset password');
      
      toast.success('Password reset email sent');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setActionLoading(`delete-${userId}`);
    try {
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to delete user');
      
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get plan badge color
  const getPlanBadgeColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'pro':
        return 'bg-green-100 text-green-800';
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (field: 'createdAt' | 'email') => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
      page: 1
    }));
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalUsers / filters.limit);
  const startIndex = (filters.page - 1) * filters.limit + 1;
  const endIndex = Math.min(filters.page * filters.limit, totalUsers);

  if (!user || !user.email || !isAdminEmail(user.email)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts, subscriptions, and access</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by email or name..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filters.sortBy} onValueChange={(value: 'createdAt' | 'email') => handleSortChange(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => handleSortChange(filters.sortBy)}
                  className="px-3"
                >
                  {filters.sortOrder === 'desc' ? '↓' : '↑'}
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="px-3"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.subscription?.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active Subscriptions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.profile?.plan === 'pro').length}
              </div>
              <div className="text-sm text-gray-600">Pro Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {users.filter(u => !u.lastLoginAt || new Date(u.lastLoginAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </div>
              <div className="text-sm text-gray-600">Inactive (30d)</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({startIndex}-{endIndex} of {totalUsers})</CardTitle>
            <CardDescription>
              Manage user accounts, subscriptions, and access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{user.email}</h3>
                            {user.profile?.firstName && (
                              <p className="text-sm text-gray-600">
                                {user.profile.firstName} {user.profile.lastName}
                              </p>
                            )}
                          </div>
                          <Badge className={getPlanBadgeColor(user.profile?.plan || 'free')}>
                            {user.profile?.plan || 'free'}
                          </Badge>
                          {user.subscription?.status === 'active' && (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Created:</span><br />
                            {formatDate(user.createdAt)}
                          </div>
                          <div>
                            <span className="font-medium">Last Login:</span><br />
                            {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                          </div>
                          <div>
                            <span className="font-medium">Workouts:</span><br />
                            {user.profile?.workoutsGenerated || 0} generated
                          </div>
                          <div>
                            <span className="font-medium">Remaining:</span><br />
                            {user.profile?.workoutsRemaining || 0} left
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Select onValueChange={(value: string) => updateSubscription(user.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Change Plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetPassword(user.id, user.email)}
                          disabled={actionLoading === `password-${user.id}`}
                        >
                          <Key className="w-4 h-4" />
                          {actionLoading === `password-${user.id}` ? '...' : 'Reset Password'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          disabled={actionLoading === `delete-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          {actionLoading === `delete-${user.id}` ? '...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {startIndex}-{endIndex} of {totalUsers} users
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={filters.page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, filters.page - 2)) + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === filters.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={filters.page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
