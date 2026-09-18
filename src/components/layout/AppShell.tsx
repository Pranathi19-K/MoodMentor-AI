import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';
import { TopNav } from './TopNav';
import { GlobalMusicPlayer } from '../music/GlobalMusicPlayer';
import { useAuth } from '@/context/AuthContext';

export const AppShell = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gradient-main relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto px-3 py-5 md:px-6 md:py-8 pb-36">

          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalMusicPlayer />
    </div>
  );
};
