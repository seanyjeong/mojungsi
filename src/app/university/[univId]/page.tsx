"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import Link from "next/link";

const API_BASE = "http://localhost:3000";

interface FormulaConfig {
  config_id: number;
  dept_id: number;
  total_score: number;
  suneung_ratio: string;
  silgi_total: number;
  subjects_config: any;
  english_scores: Record<string, number>;
  history_scores: Record<string, number>;
  calculation_mode: string;
}

interface Department {
  dept_id: number;
  dept_name: string;
  mojipgun: string;
  mojip_inwon: number;
  formula_configs: FormulaConfig | null;
  universities: { univ_name: string };
}

export default function UniversityPage({ params }: { params: Promise<{ univId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const yearId = searchParams.get("yearId") || "2026";
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDept, setEditingDept] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormulaConfig>>({});

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/admin/universities/${resolvedParams.univId}/departments?yearId=${yearId}`
        );
        const data = await res.json();
        setDepartments(data);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [resolvedParams.univId, yearId]);

  const handleEdit = (dept: Department) => {
    setEditingDept(dept.dept_id);
    setEditForm({
      total_score: dept.formula_configs?.total_score || 1000,
      suneung_ratio: dept.formula_configs?.suneung_ratio || "100",
      silgi_total: dept.formula_configs?.silgi_total || 0,
    });
  };

  const handleSave = async (dept: Department) => {
    if (!dept.formula_configs) return;

    try {
      const res = await fetch(
        `${API_BASE}/admin/formula-configs/${dept.formula_configs.config_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalScore: Number(editForm.total_score),
            suneungRatio: Number(editForm.suneung_ratio),
            silgiTotal: Number(editForm.silgi_total),
          }),
        }
      );

      if (res.ok) {
        // Refresh departments
        const updatedRes = await fetch(
          `${API_BASE}/admin/universities/${resolvedParams.univId}/departments?yearId=${yearId}`
        );
        setDepartments(await updatedRes.json());
        setEditingDept(null);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const getMojipgunLabel = (gun: string) => {
    const labels: Record<string, string> = { ga: "가군", na: "나군", da: "다군" };
    return labels[gun] || gun;
  };

  const univName = departments[0]?.universities?.univ_name || "대학";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/?yearId=${yearId}`}
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          대학 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{univName}</h1>
        <p className="text-zinc-500 dark:text-zinc-400">{yearId}학년도 · {departments.length}개 학과</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500">로딩 중...</div>
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => (
            <div
              key={dept.dept_id}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {dept.dept_name}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                      {getMojipgunLabel(dept.mojipgun)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                      모집 {dept.mojip_inwon}명
                    </span>
                  </div>
                </div>
                {editingDept === dept.dept_id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(dept)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={() => setEditingDept(null)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-200 text-zinc-700 rounded-lg text-sm hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
                    >
                      <X className="w-4 h-4" />
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(dept)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg text-sm dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    <Pencil className="w-4 h-4" />
                    수정
                  </button>
                )}
              </div>

              {dept.formula_configs ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">총점</label>
                    {editingDept === dept.dept_id ? (
                      <input
                        type="number"
                        value={editForm.total_score || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, total_score: Number(e.target.value) })
                        }
                        className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                      />
                    ) : (
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {dept.formula_configs.total_score}점
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">수능 비율</label>
                    {editingDept === dept.dept_id ? (
                      <input
                        type="number"
                        value={editForm.suneung_ratio || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, suneung_ratio: e.target.value })
                        }
                        className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                      />
                    ) : (
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {dept.formula_configs.suneung_ratio}%
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">실기 만점</label>
                    {editingDept === dept.dept_id ? (
                      <input
                        type="number"
                        value={editForm.silgi_total || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, silgi_total: Number(e.target.value) })
                        }
                        className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                      />
                    ) : (
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {dept.formula_configs.silgi_total}점
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">계산 모드</label>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {dept.formula_configs.calculation_mode}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500">formula_config 없음</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
