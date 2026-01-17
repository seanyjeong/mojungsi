"use client";

import { useState } from "react";
import { Copy, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

export default function CopyYearPage() {
  const [fromYear, setFromYear] = useState(2026);
  const [toYear, setToYear] = useState(2027);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    copiedCount?: { basic: number; ratio: number; conv: number; practical: number };
  } | null>(null);

  const handleCopy = async () => {
    if (!confirm(`${fromYear}학년도 데이터를 ${toYear}학년도로 복사하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/copy-year`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromYear, toYear }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "복사 실패");
      }
      setResult(data);
    } catch (error) {
      console.error("Failed to copy:", error);
      setResult({ success: false, message: error instanceof Error ? error.message : "복사 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">연도 데이터 복사</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          기존 연도의 departments와 formula_configs를 새 연도로 복사합니다
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              원본 연도
            </label>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
            >
              <option value={2025}>2025학년도</option>
              <option value={2026}>2026학년도</option>
              <option value={2027}>2027학년도</option>
            </select>
          </div>

          <ArrowRight className="w-6 h-6 text-zinc-400 mt-6" />

          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              대상 연도
            </label>
            <select
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
            >
              <option value={2026}>2026학년도</option>
              <option value={2027}>2027학년도</option>
              <option value={2028}>2028학년도</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCopy}
          disabled={loading || fromYear === toYear}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            "복사 중..."
          ) : (
            <>
              <Copy className="w-5 h-5" />
              데이터 복사
            </>
          )}
        </button>

        {fromYear === toYear && (
          <p className="mt-2 text-sm text-red-500">원본과 대상 연도가 같을 수 없습니다.</p>
        )}
      </div>

      {result && (
        <div className={`mt-6 rounded-xl border p-6 ${
          result.success
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        }`}>
          <h3 className={`font-semibold mb-2 ${
            result.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
          }`}>
            {result.success ? "복사 완료" : "복사 실패"}
          </h3>
          <p className={`text-sm ${
            result.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}>
            {result.message}
          </p>
          {result.copiedCount && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">기본정보</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{result.copiedCount.basic}개</p>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">비율정보</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{result.copiedCount.ratio}개</p>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">문의환산표</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{result.copiedCount.conv}개</p>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">실기정보</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{result.copiedCount.practical}개</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
