"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, FileSpreadsheet, Percent, Settings2, Database, Calendar, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

export default function Home() {
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 활성 연도 조회
  useEffect(() => {
    fetch(`${API_BASE}/admin/jungsi/active-year`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setActiveYear(data.activeYear);
      })
      .catch(console.error);
  }, []);

  // 활성 연도 변경
  const handleYearChange = async (year: number) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/active-year`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveYear(data.activeYear);
        setMessage(`활성 연도가 ${data.activeYear}년으로 변경되었습니다.`);
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">정시 관리자</h1>
        <p className="text-zinc-500 dark:text-zinc-400">대학별 정시 환산점수 계산 설정을 관리합니다</p>
      </div>

      {/* 활성 연도 설정 - 상단 고정 */}
      <div className="mb-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">활성 연도 설정</h2>
              <p className="text-sm text-white/80">학생용 앱에서 사용할 연도를 선택하세요</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {[2026, 2027, 2028].map((year) => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                disabled={saving}
                className={`px-5 py-2.5 rounded-lg font-medium transition ${
                  activeYear === year
                    ? "bg-white text-indigo-600 shadow-lg"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                {activeYear === year && <Check className="w-4 h-4 inline mr-1" />}
                {year}
              </button>
            ))}
          </div>
        </div>
        {message && (
          <div className="mt-3 text-sm bg-white/20 rounded-lg px-4 py-2">
            {message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 메인 설정 */}
        <Link
          href="/setting"
          className="group p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 transition"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">계산 설정</h2>
          </div>
          <p className="text-sm text-zinc-500">
            계산유형, 점수종류, 선택반영규칙, 가산점 등 핵심 설정을 관리합니다.
          </p>
        </Link>

        {/* 기본정보 */}
        <Link
          href="/setting/basic"
          className="group p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-green-500 dark:hover:border-green-500 transition"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition">
              <Settings2 className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">기본정보 수정</h2>
          </div>
          <p className="text-sm text-zinc-500">
            대학명, 학과명, 군, 모집정원 등 기본 정보를 수정합니다.
          </p>
        </Link>

        {/* 비율 설정 */}
        <Link
          href="/setting/ratios"
          className="group p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 dark:hover:border-purple-500 transition"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold">비율 설정</h2>
          </div>
          <p className="text-sm text-zinc-500">
            수능/내신/실기 비율, 과목별 비율, 영어/한국사 등급배점을 설정합니다.
          </p>
        </Link>

        {/* 엑셀 일괄 */}
        <Link
          href="/setting/bulk"
          className="group p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 transition"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition">
              <FileSpreadsheet className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold">엑셀 일괄 수정</h2>
          </div>
          <p className="text-sm text-zinc-500">
            엑셀 파일로 여러 학과의 정보를 한번에 다운로드/업로드합니다.
          </p>
        </Link>
      </div>

      {/* 빠른 안내 */}
      <div className="mt-12 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          작업 순서 안내
        </h3>
        <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
          <li><strong>기본정보</strong> - 대학명, 학과명이 잘못되어 있다면 먼저 수정</li>
          <li><strong>비율 설정</strong> - 수능/내신/실기 비율, 과목별 비율 설정</li>
          <li><strong>계산 설정</strong> - 점수종류, 선택규칙, 가산점 등 세부 규칙 설정</li>
          <li><strong>엑셀 일괄</strong> - 대량 수정이 필요하면 엑셀로 작업</li>
        </ol>
      </div>
    </div>
  );
}
