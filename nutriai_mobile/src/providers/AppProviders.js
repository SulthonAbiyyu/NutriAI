/**
 * AppProviders.js
 *
 * Satu tempat untuk semua Provider.
 * App.js tetap bersih — cukup <AppProviders><AppNavigator /></AppProviders>
 *
 * Cara tambah provider baru:
 *   1. Import provider-nya
 *   2. Wrap di sini — urutan dari luar ke dalam = urutan dependency
 *
 * Contoh urutan yang benar:
 *   QueryClientProvider    (paling luar — dibutuhkan semua)
 *     AuthProvider         (butuh QueryClient untuk invalidate cache saat logout)
 *       ThemeProvider      (butuh auth untuk theme personalisasi)
 *         NotifProvider    (butuh auth untuk subscribe notif user)
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider }     from '../context/AuthContext';
// import { QueryClientProvider, QueryClient } from '@tanstack/react-query'; // aktifkan saat pakai React Query
// import { ThemeProvider }  from '../context/ThemeContext';  // aktifkan saat ada dark mode toggle

// const queryClient = new QueryClient();

export default function AppProviders({ children }) {
  return (
    <SafeAreaProvider>
      {/* <QueryClientProvider client={queryClient}> */}
        <AuthProvider>
          {/* <ThemeProvider> */}
            {children}
          {/* </ThemeProvider> */}
        </AuthProvider>
      {/* </QueryClientProvider> */}
    </SafeAreaProvider>
  );
}
