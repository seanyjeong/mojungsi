"use client";

import { useState, useEffect } from "react";

const API_BASE = "http://localhost:3000";

interface Stats {
  total: number;
  byYear: { year: number; count: number }[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/formula-configs`);
        const data = await res.json();

        // Calculate stats
        const byYear = data.reduce((acc: Record<number, number>, item: any) => {
          const year = item.departments?.year_id;
          if (year) {
            acc[year] = (acc[year] || 0) + 1;
          }
          return acc;
        }, {});

        setStats({
          total: data.length,
          byYear: Object.entries(byYear).map(([year, count]) => ({
            year: Number(year),
            count: count as number,
          })).sort((a, b) => a.year - b.year),
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">통계</h1>
        <p className="text-zinc-500 dark:text-zinc-400">formula_configs 데이터 현황</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">로딩 중...</div>
      ) : stats ? (
        <div className="grid gap-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">전체 설정 수</h3>
            <p className="text-4xl font-bold text-zinc-900 dark:text-white">{stats.total}개</p>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">연도별 현황</h3>
            <div className="space-y-3">
              {stats.byYear.map(({ year, count }) => (
                <div key={year} className="flex items-center gap-4">
                  <span className="w-24 text-zinc-700 dark:text-zinc-300">{year}학년도</span>
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-medium text-zinc-900 dark:text-white">
                    {count}개
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-500">데이터를 불러올 수 없습니다</div>
      )}
    </div>
  );
}
