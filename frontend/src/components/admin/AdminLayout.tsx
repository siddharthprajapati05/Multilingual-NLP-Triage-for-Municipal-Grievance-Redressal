import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ClipboardList, Building2, Users,
  BarChart3, LogOut, Menu, X, Bell, ChevronDown, FileBarChart
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/complaints', icon: FileText, label: 'Complaints' },
  { to: '/admin/assign', icon: ClipboardList, label: 'Assign & Manage' },
  { to: '/admin/departments', icon: Building2, label: 'Departments' },
  { to: '/admin/citizens', icon: Users, label: 'Citizens' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/reports', icon: FileBarChart, label: 'Reports' },
];

const AdminLayout: React.FC = () => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
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
      <aside className="hidden lg:flex flex-col w-64 bg-primary-800 fixed h-full z-20">
        {/* Logo */}
        <div className="p-5 border-b border-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">Municipal Grievance</h1>
              <p className="text-xs text-primary-300 font-medium">Redressal System</p>
            </div>
          </div>
          <div className="mt-2 px-0.5">
            <span className="inline-block text-[10px] font-semibold bg-primary-600 text-primary-200 px-2 py-0.5 rounded-full">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 overflow-y-auto">
          <style>{`
            .admin-sidebar .sidebar-item { color: rgba(255,255,255,0.6); }
            .admin-sidebar .sidebar-item:hover { background: rgba(255,255,255,0.1); color: white; }
            .admin-sidebar .sidebar-item-active { background: white; color: #5a3218; }
          `}</style>
          <div className="admin-sidebar">
            <NavContent />
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-primary-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-900/30 w-full transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Top Bar */}
      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-warm-200 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <button className="lg:hidden btn-ghost p-2" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="hidden sm:block">
                <h2 className="text-lg font-bold text-gray-900">Admin Dashboard</h2>
                <p className="text-xs text-gray-500">Monitor, manage and resolve citizen grievances</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative btn-ghost p-2">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="flex items-center gap-2 bg-warm-50 rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white font-bold text-sm">
                  A
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800">{admin?.name || 'Admin'}</p>
                  <p className="text-[10px] text-gray-500">System Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-primary-800 shadow-modal p-4 admin-sidebar">
              <div className="flex items-center justify-between mb-6 pt-2 text-white">
                <div className="flex items-center gap-2">
                  <Building2 size={20} />
                  <span className="font-bold text-sm">Admin Portal</span>
                </div>
                <button onClick={() => setMobileOpen(false)}><X size={20} /></button>
              </div>
              <style>{`
                .admin-sidebar .sidebar-item { color: rgba(255,255,255,0.6); }
                .admin-sidebar .sidebar-item:hover { background: rgba(255,255,255,0.1); color: white; }
                .admin-sidebar .sidebar-item-active { background: white; color: #5a3218; }
              `}</style>
              <NavContent />
              <div className="mt-auto pt-6 border-t border-primary-700">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-900/30 w-full"
                >
                  <LogOut size={16} /><span>Logout</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
