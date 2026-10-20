'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Container } from './Container';
import { Button } from '@/components/ui/Button';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, Menu, X, LogOut, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/search', label: 'Tra cứu văn bằng' },
    { href: '/verify', label: 'Xác thực file' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF4DF]/90 backdrop-blur-md border-b border-[#E3D5B8] transition-all">
      <Container>
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 relative flex items-center justify-center transition-transform group-hover:scale-105">
              <Image
                src="/logo.svg"
                alt="Logo Xác thực Văn bằng"
                width={38}
                height={38}
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg leading-tight text-[#010E1C] tracking-tight">
                Xác Thực Văn Bằng
              </span>
              <span className="text-[11px] font-medium text-[#6F5C4A] tracking-wider uppercase">
                Blockchain Registry
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#FFFDF7] text-[#010E1C] shadow-2xs font-semibold border border-[#E3D5B8]'
                      : 'text-[#6F5C4A] hover:text-[#010E1C] hover:bg-[#FFFDF7]/50'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User/Auth & Wallet Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ConnectButton />

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={role === 'admin' ? '/admin' : '/issuer'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FFFDF7] border border-[#E3D5B8] text-xs font-semibold text-[#010E1C] hover:border-[#E6AB42] transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-[#E6AB42]" />
                  <span>{user.displayName || (role === 'admin' ? 'Quản trị viên' : 'Đơn vị cấp')}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 rounded-xl text-[#6F5C4A] hover:text-[#B23F4A] hover:bg-[#FAF4DF] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="primary" size="sm" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[#010E1C] hover:bg-[#FFFDF7] transition-colors border border-transparent hover:border-[#E3D5B8]"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E3D5B8] bg-[#FAF4DF] px-4 pt-3 pb-5 space-y-3">
          <div className="px-2">
            <ConnectButton className="w-full justify-center" />
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-[#FFFDF7] text-[#010E1C] font-semibold border border-[#E3D5B8]'
                  : 'text-[#6F5C4A] hover:bg-[#FFFDF7]/60 hover:text-[#010E1C]'
              )}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-2 border-t border-[#E3D5B8]/60">
            {user ? (
              <div className="space-y-2">
                <Link
                  href={role === 'admin' ? '/admin' : '/issuer'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl bg-[#FFFDF7] border border-[#E3D5B8] text-sm font-semibold text-[#010E1C]"
                >
                  Bảng điều khiển ({role === 'admin' ? 'Quản trị' : 'Đơn vị cấp'})
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#B23F4A] hover:bg-[#FAF4DF] rounded-xl flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block"
              >
                <Button variant="primary" size="md" className="w-full gap-2 justify-center">
                  <LogIn className="w-4 h-4" />
                  Đăng nhập nhà trường
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
