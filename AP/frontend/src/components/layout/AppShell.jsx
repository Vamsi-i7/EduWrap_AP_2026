import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Layers, 
  HelpCircle, 
  Trophy, 
  LogOut, 
  Bell, 
  Search, 
  X, 
  CheckCheck,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Button } from '../common/UI';

export function AppShell({ children, pageTitle = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Poll unread notification count every 30s
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await api.getUnreadCount();
        setUnreadCount(res.data.unread_count || 0);
      } catch (_) {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full notifications when drawer opens
  useEffect(() => {
    if (drawerOpen) {
      setLoadingNotifs(true);
      api.getNotifications()
        .then(res => setNotifications(res.data.notifications || []))
        .catch(() => {})
        .finally(() => setLoadingNotifs(false));
    }
  }, [drawerOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const navItems = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/rooms', label: 'Rooms', icon: Users },
    { to: '/decks', label: 'Decks', icon: Layers },
    { to: '/doubts', label: 'Doubts', icon: HelpCircle },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  return (
    <div className="flex h-screen bg-cream-100 overflow-hidden text-espresso-900">
      {/* Desktop Left Rail (72px wide, Cream 200) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-[76px] bg-cream-200 border-r border-sand-300 py-6 z-20 select-none">
        {/* Top: User Avatar linking to Profile */}
        <button
          onClick={() => navigate('/profile')}
          title="My Profile"
          className="relative group w-11 h-11 rounded-2xl bg-amber-500 text-ivory-50 flex items-center justify-center font-bold text-base shadow-sm hover:scale-105 transition"
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          <span className="absolute left-16 bg-espresso-900 text-ivory-50 text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30">
            Profile & Settings
          </span>
        </button>

        {/* Center: Primary Navigation Icons */}
        <nav className="flex flex-col gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={`relative group flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-ivory-50 text-amber-500 shadow-tile shadow-sand-300/50'
                    : 'text-espresso-700 hover:bg-cream-150 hover:text-espresso-900'
                }`}
              >
                {/* Active Indicator Bar on Left */}
                {isActive && (
                  <span className="absolute -left-3 top-2 bottom-2 w-1.5 bg-amber-500 rounded-r-md" />
                )}
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {/* Tooltip on hover */}
                <span className="absolute left-16 bg-espresso-900 text-ivory-50 text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom: Logout */}
        <button
          onClick={logout}
          title="Log Out"
          className="relative group flex items-center justify-center w-11 h-11 rounded-xl text-espresso-700 hover:bg-cream-150 hover:text-red-700 transition"
        >
          <LogOut size={20} />
          <span className="absolute left-16 bg-espresso-900 text-ivory-50 text-xs px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30">
            Log Out
          </span>
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page Header */}
        <header className="h-16 px-6 bg-cream-100/90 backdrop-blur-md border-b border-sand-300 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-espresso-900">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              title="Notifications"
              className="relative p-2 rounded-xl text-espresso-700 hover:bg-cream-150 hover:text-espresso-900 transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-ivory-50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Mobile Profile Avatar */}
            <button
              onClick={() => navigate('/profile')}
              className="md:hidden w-8 h-8 rounded-lg bg-amber-500 text-ivory-50 font-bold text-sm flex items-center justify-center"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-cream-200 border-t border-sand-300 flex items-center justify-around z-30 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition ${
                  isActive ? 'text-amber-500 font-semibold' : 'text-espresso-700'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Notifications Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-espresso-900/30 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-ivory-50 border-l border-sand-300 h-full shadow-2xl flex flex-col animate-slideLeft">
            <div className="p-4 border-b border-sand-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-amber-500" />
                <h3 className="font-bold text-espresso-900">Notifications</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-lg text-espresso-500 hover:bg-cream-150"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-sand-300/60 p-2">
              {loadingNotifs ? (
                <div className="p-8 text-center text-sm text-espresso-500">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-espresso-500">
                  No notifications yet. You're all caught up!
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`p-3 rounded-xl transition ${
                      n.is_read ? 'opacity-70' : 'bg-cream-150/50'
                    }`}
                  >
                    <p className="text-sm text-espresso-900 font-medium">{n.message}</p>
                    <span className="text-[11px] text-espresso-500 block mt-1">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
