'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, logoutAPI, loginAPI } from '@/lib/api/auth';
import { authHelpers } from '@/lib/api/axiosInstance';
import type { LoginCredentials, User } from '@/types';

export function useAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const u = await getCurrentUser();
      // Sync role ke cookie agar sidebar langsung terbaca tanpa refetch
      if (u?.role) authHelpers.setRole(u.role);
      return u;
    },
    enabled: authHelpers.isAuthenticated(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = useMutation({
    mutationFn: logoutAPI,
    onSettled: () => {
      // Selalu hapus token lokal, baik request berhasil maupun gagal
      authHelpers.removeToken();
      authHelpers.removeRole();
      queryClient.clear();

      // Full navigation agar proxy mendeteksi tidak ada token
      // dan tidak membolehkan akses ke protected route
      window.location.href = '/login';
    },
  });

  return {
    user,
    role: user?.role ?? authHelpers.getRole(),
    isAdmin: user?.role === 'admin',
    isLoading,
    isAuthenticated: authHelpers.isAuthenticated(),
    error,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}