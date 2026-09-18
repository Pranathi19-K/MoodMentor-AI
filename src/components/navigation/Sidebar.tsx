import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  BarChart3, 
  Sparkles, 
  Dumbbell, 
  BookOpen, 
  Settings,
  Brain,
  Target,
  Music,
  LogOut,
  Camera,
  Smile,
  Flame,
  FileText,
  Trophy,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWellness } from '@/context/WellnessContext';
import { useAuth } from '@/context/AuthContext';
import { getAvatarByEmojiOrId } from '@/data/avatars';
import { AvatarImage } from '@/components/common/AvatarImage';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: PlusCircle, label: 'Check-in', path: '/mood-checkin' },
  { icon: History, label: 'History', path: '/mood-history' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Sparkles, label: 'Wellness Hub', path: '/wellness' },
  { icon: Brain, label: 'AI Mentor', path: '/ai-mentor' },
  { icon: Camera, label: 'Mood Vision', path: '/mood-vision' },
  { icon: Dumbbell, label: 'Mind Gym', path: '/mind-gym' },
  { icon: BookOpen, label: 'Journal', path: '/journal' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: Flame, label: 'Wellness Journey', path: '/streaks' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Music, label: 'Music', path: '/music' },
  { icon: Smile, label: 'Smile Break', path: '/smile-break' },
  { icon: Trophy, label: 'Achievements', path: '/achievements' },
];

export const Sidebar = () => {
  const { userData } = useWellness();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const avatarData = getAvatarByEmojiOrId(userData.profile.avatar);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-16 md:w-72 bg-black/20 backdrop-blur-3xl border-r border-border-subtle flex flex-col shrink-0 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-3 md:p-8 flex items-center gap-3 justify-center md:justify-start">
        <div className="w-10 h-10 bg-gradient-neon rounded-xl flex items-center justify-center shadow-glow-primary shrink-0">
          <Brain className="text-primary-text" size={24} />
        </div>
        <span className="hidden md:block text-xl font-black tracking-tighter truncate">
          MOOD MENTOR <span className="text-primary italic">AI</span>
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 md:px-4 py-4 md:py-6 space-y-1.5 md:space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) => cn(
              "flex items-center justify-center md:justify-start gap-4 px-2.5 md:px-6 py-3 rounded-2xl font-bold transition-all duration-300 group",
              isActive 
                ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(0,217,255,0.05)]" 
                : "text-muted hover:bg-card hover:text-primary-text"
            )}
          >
            <item.icon size={20} className="shrink-0" />
            <span className="hidden md:block tracking-tight text-sm truncate">{item.label}</span>
          </NavLink>
        ))}

        {/* Section Divider & Heading */}
        <div className="hidden md:block pt-6 pb-2 px-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted/50">Settings & Account</p>
        </div>
        <div className="md:hidden my-2 border-t border-border-subtle/40" />

        {/* Account Links */}
        {[
          { icon: User, label: 'Profile', path: '/profile' },
          { icon: Settings, label: 'Settings', path: '/settings' },
        ].map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={({ isActive }) => cn(
              "flex items-center justify-center md:justify-start gap-4 px-2.5 md:px-6 py-3 rounded-2xl font-bold transition-all duration-300 group",
              isActive 
                ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(0,217,255,0.05)]" 
                : "text-muted hover:bg-card hover:text-primary-text"
            )}
          >
            <item.icon size={20} className="shrink-0" />
            <span className="hidden md:block tracking-tight text-sm truncate">{item.label}</span>
          </NavLink>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-full flex items-center justify-center md:justify-start gap-4 px-2.5 md:px-6 py-3 rounded-2xl font-bold text-muted hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group"
        >
          <LogOut size={20} className="shrink-0" />
          <span className="hidden md:block tracking-tight text-sm truncate">Logout</span>
        </button>
      </nav>

      {/* Profile Card Footer */}
      <div className="p-2 md:p-6 mt-auto border-t border-border-subtle bg-white/2 space-y-4">
        <NavLink 
          to="/profile" 
          title={userData.profile.name}
          className="flex items-center justify-center md:justify-start gap-3 p-1.5 md:p-3 bg-card rounded-2xl border border-border group cursor-pointer hover:bg-primary-text/10 transition-all"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-glow-primary group-hover:scale-110 transition-transform overflow-hidden p-0.5 shrink-0">
            <div className="w-full h-full bg-background rounded-[10px] overflow-hidden">
              <AvatarImage src={avatarData.image} alt={avatarData.name} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="hidden md:block flex-1 min-w-0">
            <p className="text-sm font-black tracking-tight truncate">{userData.profile.name}</p>
            <p className="text-[10px] font-bold text-primary uppercase tracking-tighter italic truncate">Wellness Member</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};