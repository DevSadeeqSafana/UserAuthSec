import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, logoutAll, getCurrentUser } from '../services/authService';
import { 
    Shield, 
    LogOut, 
    User as UserIcon, 
    LayoutDashboard, 
    Settings, 
    ShieldCheck, 
    Activity, 
    Globe,
    Bell,
    Lock
} from 'lucide-react';

import { toast } from 'sonner';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const user = getCurrentUser();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const handleLogoutAll = async () => {
        if (window.confirm('This will log you out from ALL devices. Continue?')) {
            await logoutAll();
            toast.success('Logged out from all devices');
            navigate('/login');
        }
    };

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', active: location.pathname === '/dashboard' },
        { name: 'Secure Vault', icon: Lock, path: '/vault', active: location.pathname === '/vault' },
        { name: 'Profile', icon: UserIcon, path: '/profile', active: location.pathname === '/profile' },
        { name: 'Security', icon: ShieldCheck, path: '/security', active: location.pathname === '/security' },
        { name: 'Settings', icon: Settings, path: '/settings', active: location.pathname === '/settings' },
    ];

    if (user?.role === 'admin') {
        navItems.push({ name: 'Intelligence', icon: Activity, path: '/admin', active: location.pathname === '/admin' });
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg)' }}>
            {/* Sidebar */}
            <div style={{ 
                width: '280px', 
                background: 'rgba(15, 23, 42, 0.9)', 
                borderRight: '1px solid var(--border)', 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '32px',
                position: 'fixed',
                height: '100vh'
            }}>
                <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                    <Shield size={28} color="#6366f1" />
                    <span className="logo-text" style={{ fontSize: '1.25rem' }}>UAAuthSec</span>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {navItems.map((item) => (
                        <div
                            key={item.name}
                            onClick={() => navigate(item.path)}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                padding: '12px', 
                                borderRadius: '12px', 
                                background: item.active ? 'rgba(99, 102, 241, 0.1)' : 'transparent', 
                                color: item.active ? 'var(--primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            className="nav-item"
                        >
                            <item.icon size={20} />
                            <span style={{ fontWeight: item.active ? '600' : '400' }}>{item.name}</span>
                        </div>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        onClick={handleLogoutAll}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', color: 'var(--text-muted)', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <Globe size={20} />
                        <span style={{ fontSize: '0.875rem' }}>Logout All Devices</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', color: '#f87171', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <LogOut size={20} />
                        <span style={{ fontWeight: '600' }}>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, marginLeft: '280px', padding: '40px', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>
                            {location.pathname === '/admin' ? 'Security Intelligence' : 
                             location.pathname === '/profile' ? 'My Profile' :
                             location.pathname === '/security' ? 'Security Settings' :
                             location.pathname === '/settings' ? 'System Settings' :
                             `Welcome, ${user?.full_name || 'User'}`}
                        </h1>
                        <p style={{ color: 'var(--text-muted)' }}>
                            {location.pathname === '/admin' ? 'Global overview and threat monitoring' : 
                             'Your personal security control center'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button 
                            onClick={() => toast.info('Notification system coming soon!')}
                            style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                            <Bell size={20} color="var(--text-muted)" />
                        </button>
                        <div 
                            onClick={() => navigate('/profile')}
                            style={{ 
                                width: '48px', 
                                height: '48px', 
                                borderRadius: '12px', 
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease'
                            }}
                            className="avatar-hover"
                        >
                            {user?.full_name?.[0] || 'U'}
                        </div>
                    </div>
                </header>
                {children}
            </div>
        </div>
    );
};

export default Layout;
