import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, Search, History, Bell, User,
  LogOut, Menu, X, HelpCircle, Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/submit', icon: FilePlus, label: 'Submit Complaint' },
  { to: '/track', icon: Search, label: 'Track Complaint' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const CitizenLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavContent = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => isActive ? 'sidebar-item-active' : 'sidebar-item'}
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-warm-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-warm-200 shadow-card fixed h-full z-20">
        <div className="p-5 border-b border-warm-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-700 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Municipal Grievance</h1>
              <p className="text-xs text-primary-600 font-medium">Portal</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 ml-13">AI-Powered · Multilingual · Citizen Centric</p>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <NavContent />
        </div>

        <div className="p-4 border-t border-warm-200">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
              {user?.fullName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || user?.mobile}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item w-full text-red-600 hover:bg-red-50">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-warm-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">Municipal Grievance</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-ghost p-2">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-modal p-4">
            <div className="flex items-center justify-between mb-6 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-700 flex items-center justify-center">
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Municipal Grievance</p>
                  <p className="text-xs text-primary-600">Portal</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <NavContent />
            <div className="mt-auto pt-6 border-t border-warm-200">
              <button onClick={handleLogout} className="sidebar-item w-full text-red-600 hover:bg-red-50">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CitizenLayout;
