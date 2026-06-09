import { RouterProvider } from 'react-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppDataProvider } from '@/contexts/AppDataContext';
import { router } from './routes';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors={false} closeButton />
      </AppDataProvider>
    </AuthProvider>
  );
}
