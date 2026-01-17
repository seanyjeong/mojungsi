"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Copy, BarChart, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function Sidebar() {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  // 로그인 페이지에서는 사이드바 숨김
  if (pathname === "/login") {
    return null;
  }

  // 로딩 중이거나 로그인 안됨
  if (isLoading || !user) {
    return null;
  }

  const navItems = [
    { href: "/", label: "대학/학과 관리", icon: Building2 },
    { href: "/copy-year", label: "연도 복사", icon: Copy },
    { href: "/stats", label: "통계", icon: BarChart },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">정시 관리자</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">체대입시 계산 설정</p>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">{user.username}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.role}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
