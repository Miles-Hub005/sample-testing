'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Headphones,
  DollarSign,
  BookOpen,
  Menu,
  X,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { apiClient, NavigationItem, UserMeResponse } from '../../services/apiClient';
import { cn } from '../../lib/utils';

export interface NavItem {
  title: string;
  path: string;
  is_accessible?: boolean;
  icon_id?: string;
}

export interface UserInfo {
  email?: string;
  roles?: string[];
  tenant_id?: string;
}

export interface NavBarProps {
  /**
   * Custom navigation items override. If omitted, items will be loaded via API
   * or fallback to default domain areas.
   */
  items?: NavItem[];

  /**
   * Current active path override (useful for testing or server-side rendering).
   */
  currentPath?: string;

  /**
   * Active authenticated user details.
   */
  user?: UserInfo | null;

  /**
   * Custom callback function invoked when user clicks the Logout button.
   */
  onLogout?: () => void;

  /**
   * Custom CSS class names to append to navigation bar wrapper.
   */
  className?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    is_accessible: true,
    icon_id: 'dashboard',
  },
  {
    title: 'Performance',
    path: '/performance',
    is_accessible: true,
    icon_id: 'performance',
  },
  {
    title: 'Contracts',
    path: '/contracts',
    is_accessible: true,
    icon_id: 'contracts',
  },
  {
    title: 'Support',
    path: '/support',
    is_accessible: true,
    icon_id: 'support',
  },
  {
    title: 'Financials',
    path: '/financials',
    is_accessible: true,
    icon_id: 'financials',
  },
  {
    title: 'Knowledge Base',
    path: '/knowledge',
    is_accessible: true,
    icon_id: 'knowledge',
  },
];

/**
 * Render appropriate icon for navigation item based on icon_id.
 */
function renderNavIcon(iconId?: string, className: string = 'w-5 h-5') {
  const normalized = (iconId || '').toLowerCase().trim();
  switch (normalized) {
    case 'dashboard':
      return <LayoutDashboard className={className} aria-hidden="true" />;
    case 'performance':
      return <TrendingUp className={className} aria-hidden="true" />;
    case 'contracts':
      return <FileText className={className} aria-hidden="true" />;
    case 'support':
      return <Headphones className={className} aria-hidden="true" />;
    case 'financials':
      return <DollarSign className={className} aria-hidden="true" />;
    case 'knowledge':
    case 'knowledge_base':
    case 'knowledge-base':
      return <BookOpen className={className} aria-hidden="true" />;
    default:
      return <LayoutDashboard className={className} aria-hidden="true" />;
  }
}

/**
 * Check whether a target navigation path matches the active URL pathname.
 */
export function isRouteActive(itemPath: string, activePath: string): boolean {
  if (!activePath) return false;
  if (itemPath === '/' && activePath === '/') return true;
  if (itemPath !== '/') {
    return activePath === itemPath || activePath.startsWith(`${itemPath}/`);
  }
  return false;
}

/**
 * Responsive Navigation Bar Component.
 * Implements WCAG 2.1 AA compliant accessibility, active route highlighting,
 * responsive mobile menu drawer, and RBAC-filtered navigation links.
 */
export const NavBar: React.FC<NavBarProps> = ({
  items: propsItems,
  currentPath: propsCurrentPath,
  user: propsUser,
  onLogout,
  className,
}) => {
  let hookPathname = '';
  try {
    // Safely execute usePathname hook in Next.js App Router context
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const resolved = usePathname();
    hookPathname = resolved || '';
  } catch {
    hookPathname = '';
  }

  const activePath = propsCurrentPath !== undefined ? propsCurrentPath : hookPathname;

  const [navItems, setNavItems] = useState<NavItem[]>(propsItems || DEFAULT_NAV_ITEMS);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(propsUser || null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(!propsItems);

  // Sync props state updates
  useEffect(() => {
    if (propsItems) {
      setNavItems(propsItems);
      setIsLoading(false);
    }
  }, [propsItems]);

  useEffect(() => {
    if (propsUser !== undefined) {
      setCurrentUser(propsUser);
    }
  }, [propsUser]);

  // Fetch authorized navigation items and user info on mount if not provided as props
  useEffect(() => {
    let isMounted = true;

    async function loadNavData() {
      if (!propsItems) {
        try {
          const menuData = await apiClient.getNavigationMenu();
          if (isMounted && menuData && Array.isArray(menuData.items)) {
            setNavItems(menuData.items);
          }
        } catch {
          // If API call fails or user unauthenticated, fallback to default items
          if (isMounted) {
            setNavItems(DEFAULT_NAV_ITEMS);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }

      if (propsUser === undefined && apiClient.getToken()) {
        try {
          const userData: UserMeResponse | null = await apiClient.getMe();
          if (isMounted && userData) {
            setCurrentUser({
              email: userData.email,
              roles: userData.roles,
              tenant_id: userData.tenant_id,
            });
          }
        } catch {
          // Silently handle auth fetch errors
        }
      }
    }

    loadNavData();

    return () => {
      isMounted = false;
    };
  }, [propsItems, propsUser]);

  // Filter out any explicitly unauthorized items (FR-4, FR-5)
  const accessibleItems = navItems.filter((item) => item.is_accessible !== false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      apiClient.clearToken();
      apiClient.handleUnauthorizedRedirect();
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={cn('bg-[#1b1c19] text-[#fbf9f4] shadow-md border-b border-[#30312e]', className)}>
      <nav aria-label="Global navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 text-[#fbf9f4] hover:text-[#e0c1a1] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1c19] rounded-md px-2 py-1"
              aria-label="Platform Home - Dashboard"
            >
              <div className="w-8 h-8 rounded bg-[#735c41] flex items-center justify-center font-bold text-lg text-white">
                P
              </div>
              <span className="font-serif text-xl font-semibold tracking-tight">
                Platform Access
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links (FR-2, FR-3) */}
          <div className="hidden md:flex md:items-center md:space-x-1 lg:space-x-2">
            {accessibleItems.map((item) => {
              const active = isRouteActive(item.path, activePath);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1c19]',
                    active
                      ? 'bg-[#735c41] text-white font-semibold shadow-inner'
                      : 'text-[#e4e2dd] hover:bg-[#30312e] hover:text-white'
                  )}
                >
                  {renderNavIcon(item.icon_id, 'w-4 h-4')}
                  <span>{item.title}</span>
                  {active && <span className="sr-only">(current page)</span>}
                </Link>
              );
            })}
          </div>

          {/* User Controls & Logout (Desktop) */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {currentUser && (
              <div className="flex items-center space-x-2 text-xs text-[#d1c4b9]">
                <UserIcon className="w-4 h-4 text-[#e0c1a1]" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="font-medium text-[#fbf9f4] truncate max-w-[140px]">
                    {currentUser.email}
                  </span>
                  {currentUser.roles && currentUser.roles.length > 0 && (
                    <span className="text-[10px] text-[#e0c1a1]">
                      {currentUser.roles.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium',
                'bg-[#a43b2c] hover:bg-[#b84a39] text-white transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1c19]'
              )}
              aria-label="Log out of application"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Log out</span>
            </button>
          </div>

          {/* Mobile Menu Toggle Button (NFR-4, FR-8) */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className={cn(
                'inline-flex items-center justify-center p-2 rounded-md text-[#e4e2dd]',
                'hover:text-white hover:bg-[#30312e] transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1c19]'
              )}
              aria-controls="mobile-navigation-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Menu (NFR-4) */}
        {isMobileMenuOpen && (
          <div
            id="mobile-navigation-menu"
            className="md:hidden border-t border-[#30312e] py-3 space-y-1 px-2 bg-[#1b1c19]"
          >
            {accessibleItems.map((item) => {
              const active = isRouteActive(item.path, activePath);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={closeMobileMenu}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1c19]',
                    active
                      ? 'bg-[#735c41] text-white font-semibold'
                      : 'text-[#e4e2dd] hover:bg-[#30312e] hover:text-white'
                  )}
                >
                  {renderNavIcon(item.icon_id, 'w-5 h-5')}
                  <span>{item.title}</span>
                  {active && <span className="sr-only">(current page)</span>}
                </Link>
              );
            })}

            {/* Mobile User Info & Logout Button */}
            <div className="pt-4 mt-2 border-t border-[#30312e] px-3 space-y-3">
              {currentUser && (
                <div className="flex items-center space-x-2 text-sm text-[#d1c4b9]">
                  <UserIcon className="w-4 h-4 text-[#e0c1a1]" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="font-medium text-[#fbf9f4] truncate">
                      {currentUser.email}
                    </span>
                    {currentUser.roles && currentUser.roles.length > 0 && (
                      <span className="text-xs text-[#e0c1a1]">
                        {currentUser.roles.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  handleLogout();
                }}
                className={cn(
                  'w-full flex items-center justify-center space-x-2 px-4 py-2 rounded text-sm font-medium',
                  'bg-[#a43b2c] hover:bg-[#b84a39] text-white transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400'
                )}
                aria-label="Log out of application"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default NavBar;
