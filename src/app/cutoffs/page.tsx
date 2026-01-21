"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Save, Search, RefreshCw, Target, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

interface University {
  U_ID: number;
  univ_name: string;
  dept_name: string;
  quota: number;
  step_type: number; // 0: 일괄, N: N배수 1단계
  has_practical_table: boolean;
  is_relative_eval: boolean;
  // 기존 합격컷 데이터
  prev_sunung_cut: number | null;
  prev_total_cut: number | null;
  expected_sunung_cut: number | null;
  expected_total_cut: number | null;
}

interface CutoffChange {
  U_ID: number;
  prev_sunung_cut: number | null;
  prev_total_cut: number | null;
  expected_sunung_cut: number | null;
  expected_total_cut: number | null;
}

export default function CutoffsPage() {
  const [year, setYear] = useState(2027);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 변경된 데이터 추적
  const [changes, setChanges] = useState<Map<number, CutoffChange>>(new Map());

  // 데이터 불러오기
  const fetchUniversities = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/cutoffs/universities?year=${year}`);
      const data = await res.json();
      setUniversities(data);
      setChanges(new Map());
    } catch (error) {
      console.error("Failed to fetch:", error);
      setMessage({ type: "error", text: "데이터 로드 실패" });
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchUniversities();
  }, [fetchUniversities]);

  // 필터링된 대학 목록
  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) return universities;
    const query = searchQuery.toLowerCase();
    return universities.filter(
      (u) =>
        u.univ_name.toLowerCase().includes(query) ||
        u.dept_name.toLowerCase().includes(query)
    );
  }, [universities, searchQuery]);

  // 값 변경 핸들러
  const handleValueChange = (
    uId: number,
    field: keyof CutoffChange,
    value: string
  ) => {
    const univ = universities.find((u) => u.U_ID === uId);
    if (!univ) return;

    const numValue = value === "" ? null : Number(value);

    setChanges((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(uId) || {
        U_ID: uId,
        prev_sunung_cut: univ.prev_sunung_cut,
        prev_total_cut: univ.prev_total_cut,
        expected_sunung_cut: univ.expected_sunung_cut,
        expected_total_cut: univ.expected_total_cut,
      };
      newMap.set(uId, { ...existing, [field]: numValue });
      return newMap;
    });

    // UI 업데이트
    setUniversities((prev) =>
      prev.map((u) =>
        u.U_ID === uId ? { ...u, [field]: numValue } : u
      )
    );
  };

  // 저장
  const handleSave = async () => {
    if (changes.size === 0) {
      setMessage({ type: "error", text: "변경사항이 없습니다" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const cutoffs = Array.from(changes.values()).map((c) => ({
        ...c,
        admission_year: year,
      }));

      const res = await fetch(`${API_BASE}/admin/cutoffs/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffs }),
      });

      const data = await res.json();
      if (data.updated) {
        setMessage({ type: "success", text: `${data.updated}개 저장 완료` });
        setChanges(new Map());
      } else {
        setMessage({ type: "error", text: "저장 실패" });
      }
    } catch (error) {
      console.error("Failed to save:", error);
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSaving(false);
    }
  };

  // 학교 유형 뱃지
  const getTypeBadge = (univ: University) => {
    const isStep = univ.step_type > 0;
    const isRelative = univ.is_relative_eval;

    if (isStep && !isRelative) {
      return (
        <span className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          1단계 {univ.step_type}배수
        </span>
      );
    }
    if (isStep && isRelative) {
      return (
        <span className="px-2 py-0.5 text-xs rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
          1단계 상대
        </span>
      );
    }
    if (!isStep && !isRelative) {
      return (
        <span className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          일괄 절대
        </span>
      );
    }
    return null;
  };

  // 입력 필드 표시 여부
  const showSunungCut = (univ: University) => univ.step_type > 0;
  const showTotalCut = (univ: University) => !univ.is_relative_eval;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">합격컷 관리</h1>
            <p className="text-sm text-zinc-500">대학별 전년도/예상 합격컷을 입력합니다</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">입시 학년도</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
            >
              <option value={2027}>2027학년도</option>
              <option value={2028}>2028학년도</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">대학 검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="대학명 또는 학과명 검색..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
              />
            </div>
          </div>
          <button
            onClick={fetchUniversities}
            disabled={loading}
            className="px-4 py-2 border rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium mb-1">입력 규칙</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
            <li><strong>1단계 + 절대평가</strong>: 수능컷 + 총점컷 모두 입력</li>
            <li><strong>1단계 + 상대평가</strong>: 수능컷만 입력 (실기 상대평가로 총점 의미 없음)</li>
            <li><strong>일괄 + 절대평가</strong>: 총점컷만 입력</li>
            <li><strong>일괄 + 상대평가</strong>: 목록에서 제외 (예측 불가)</li>
          </ul>
        </div>
      </div>

      {/* Loading */}
      {loading && <div className="text-center py-12 text-zinc-500">로딩 중...</div>}

      {/* Table */}
      {!loading && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">대학/학과</th>
                  <th className="px-3 py-3 text-center font-medium w-20">유형</th>
                  <th className="px-3 py-3 text-center font-medium" colSpan={2}>
                    전년도 ({year - 1}학년도)
                  </th>
                  <th className="px-3 py-3 text-center font-medium" colSpan={2}>
                    올해 예상 ({year}학년도)
                  </th>
                </tr>
                <tr className="bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
                  <th></th>
                  <th></th>
                  <th className="px-3 py-2 text-center font-normal text-xs text-zinc-500">수능컷</th>
                  <th className="px-3 py-2 text-center font-normal text-xs text-zinc-500">총점컷</th>
                  <th className="px-3 py-2 text-center font-normal text-xs text-zinc-500">수능컷</th>
                  <th className="px-3 py-2 text-center font-normal text-xs text-zinc-500">총점컷</th>
                </tr>
              </thead>
              <tbody>
                {filteredUniversities.map((univ) => (
                  <tr
                    key={univ.U_ID}
                    className="border-t border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {univ.univ_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {univ.dept_name} ({univ.quota}명)
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {getTypeBadge(univ)}
                    </td>
                    {/* 전년도 수능컷 */}
                    <td className="px-2 py-2 text-center">
                      {showSunungCut(univ) ? (
                        <input
                          type="number"
                          value={univ.prev_sunung_cut ?? ""}
                          onChange={(e) =>
                            handleValueChange(univ.U_ID, "prev_sunung_cut", e.target.value)
                          }
                          className="w-20 p-1.5 border rounded text-center bg-white dark:bg-zinc-700 text-sm"
                          placeholder="-"
                        />
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">-</span>
                      )}
                    </td>
                    {/* 전년도 총점컷 */}
                    <td className="px-2 py-2 text-center">
                      {showTotalCut(univ) ? (
                        <input
                          type="number"
                          value={univ.prev_total_cut ?? ""}
                          onChange={(e) =>
                            handleValueChange(univ.U_ID, "prev_total_cut", e.target.value)
                          }
                          className="w-20 p-1.5 border rounded text-center bg-white dark:bg-zinc-700 text-sm"
                          placeholder="-"
                        />
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">-</span>
                      )}
                    </td>
                    {/* 올해 예상 수능컷 */}
                    <td className="px-2 py-2 text-center">
                      {showSunungCut(univ) ? (
                        <input
                          type="number"
                          value={univ.expected_sunung_cut ?? ""}
                          onChange={(e) =>
                            handleValueChange(univ.U_ID, "expected_sunung_cut", e.target.value)
                          }
                          className="w-20 p-1.5 border rounded text-center bg-blue-50 dark:bg-blue-900/20 text-sm"
                          placeholder="-"
                        />
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">-</span>
                      )}
                    </td>
                    {/* 올해 예상 총점컷 */}
                    <td className="px-2 py-2 text-center">
                      {showTotalCut(univ) ? (
                        <input
                          type="number"
                          value={univ.expected_total_cut ?? ""}
                          onChange={(e) =>
                            handleValueChange(univ.U_ID, "expected_total_cut", e.target.value)
                          }
                          className="w-20 p-1.5 border rounded text-center bg-blue-50 dark:bg-blue-900/20 text-sm"
                          placeholder="-"
                        />
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUniversities.length === 0 && !loading && (
            <div className="text-center py-12 text-zinc-500">
              {searchQuery ? "검색 결과가 없습니다" : "데이터가 없습니다"}
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="sticky bottom-4 bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {message && (
            <span
              className={`text-sm font-medium ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </span>
          )}
          {changes.size > 0 && (
            <span className="text-sm text-zinc-500">
              {changes.size}개 변경됨
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || changes.size === 0}
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          <Save className="w-5 h-5" />
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
