"use client";

import { useState, useEffect } from "react";
import { Search, Save, Plus, Trash2, Dumbbell } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

// 초성 목록
const KOREAN_CONSONANTS = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ".split("");

// 초성 추출
function getConsonant(str: string): string | null {
  if (!str) return null;
  const ch = str.trim()[0];
  if (!ch) return null;
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const fullConsonants = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split("");
  return fullConsonants[Math.floor(code / 588)] ?? null;
}

// 군 정규화
function normGun(g: string | null): string {
  if (!g) return "기타";
  const s = String(g).trim();
  if (s.includes("가")) return "가군";
  if (s.includes("나")) return "나군";
  if (s.includes("다")) return "다군";
  return "기타";
}

interface University {
  U_ID: number;
  대학명: string;
  학과명: string;
  군: string;
}

interface PracticalScore {
  id?: number;
  gender: string;
  record: string;
  score: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface GroupedScores {
  [eventName: string]: PracticalScore[];
}

export default function PracticalScoresPage() {
  const [year, setYear] = useState(2027);
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [selectedInitial, setSelectedInitial] = useState("ㄱ");
  const [selectedGun, setSelectedGun] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);

  const [practicalScores, setPracticalScores] = useState<GroupedScores>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New event form
  const [newEventName, setNewEventName] = useState("");

  // Load universities
  useEffect(() => {
    const fetchUniversities = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/admin/jungsi/basic?year=${year}`);
        const data = await res.json();
        if (data.success) {
          setUniversities(data.list || []);
        }
      } catch (error) {
        console.error("Failed to fetch universities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUniversities();
  }, [year]);

  // Filter universities
  useEffect(() => {
    let filtered = universities;

    if (selectedInitial) {
      filtered = filtered.filter((u) => {
        const consonant = getConsonant(u.대학명);
        const mappedInitial = selectedInitial === "ㄱ" ? ["ㄱ", "ㄲ"] :
                             selectedInitial === "ㄷ" ? ["ㄷ", "ㄸ"] :
                             selectedInitial === "ㅂ" ? ["ㅂ", "ㅃ"] :
                             selectedInitial === "ㅅ" ? ["ㅅ", "ㅆ"] :
                             selectedInitial === "ㅈ" ? ["ㅈ", "ㅉ"] : [selectedInitial];
        return consonant && mappedInitial.includes(consonant);
      });
    }

    if (selectedGun !== "전체") {
      filtered = filtered.filter((u) => normGun(u.군) === selectedGun);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.대학명.toLowerCase().includes(term) ||
          u.학과명.toLowerCase().includes(term)
      );
    }

    setFilteredUniversities(filtered);
  }, [universities, selectedInitial, selectedGun, searchTerm]);

  // Load practical scores
  const loadPracticalScores = async (univ: University) => {
    setSelectedUniv(univ);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/practical/${univ.U_ID}/${year}`);
      const data = await res.json();
      if (data.success) {
        setPracticalScores(data.data || {});
      }
    } catch (error) {
      console.error("Failed to load practical scores:", error);
    }
  };

  // Add new event
  const handleAddEvent = () => {
    if (!newEventName.trim()) return;
    setPracticalScores(prev => ({
      ...prev,
      [newEventName.trim()]: [{ gender: "남", record: "", score: 0, isNew: true }]
    }));
    setNewEventName("");
  };

  // Add row to event
  const handleAddRow = (eventName: string) => {
    setPracticalScores(prev => ({
      ...prev,
      [eventName]: [...(prev[eventName] || []), { gender: "남", record: "", score: 0, isNew: true }]
    }));
  };

  // Update row
  const handleUpdateRow = (eventName: string, index: number, field: keyof PracticalScore, value: string | number) => {
    setPracticalScores(prev => ({
      ...prev,
      [eventName]: prev[eventName].map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  // Delete row
  const handleDeleteRow = (eventName: string, index: number) => {
    setPracticalScores(prev => {
      const rows = prev[eventName];
      const row = rows[index];
      if (row.id) {
        // Mark for deletion
        return {
          ...prev,
          [eventName]: rows.map((r, i) => i === index ? { ...r, isDeleted: true } : r)
        };
      } else {
        // Remove new row
        return {
          ...prev,
          [eventName]: rows.filter((_, i) => i !== index)
        };
      }
    });
  };

  // Delete entire event
  const handleDeleteEvent = (eventName: string) => {
    setPracticalScores(prev => {
      const rows = prev[eventName];
      const hasExisting = rows.some(r => r.id);
      if (hasExisting) {
        // Mark all for deletion
        return {
          ...prev,
          [eventName]: rows.map(r => ({ ...r, isDeleted: true }))
        };
      } else {
        // Remove entirely
        const { [eventName]: _, ...rest } = prev;
        return rest;
      }
    });
  };

  // Save all changes
  const handleSave = async () => {
    if (!selectedUniv) return;
    setSaving(true);
    setMessage(null);

    try {
      const promises: Promise<Response>[] = [];

      for (const [eventName, rows] of Object.entries(practicalScores)) {
        for (const row of rows) {
          if (row.isDeleted && row.id) {
            // Delete
            promises.push(
              fetch(`${API_BASE}/admin/jungsi/practical/${row.id}`, {
                method: "DELETE"
              })
            );
          } else if (row.isNew && !row.isDeleted) {
            // Create
            promises.push(
              fetch(`${API_BASE}/admin/jungsi/practical`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  U_ID: selectedUniv.U_ID,
                  year,
                  event_name: eventName,
                  gender: row.gender,
                  record: row.record,
                  score: row.score
                })
              })
            );
          } else if (row.id && !row.isDeleted) {
            // Update
            promises.push(
              fetch(`${API_BASE}/admin/jungsi/practical/${row.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event_name: eventName,
                  gender: row.gender,
                  record: row.record,
                  score: row.score
                })
              })
            );
          }
        }
      }

      await Promise.all(promises);
      setMessage({ type: "success", text: "저장 완료" });

      // Reload data
      await loadPracticalScores(selectedUniv);
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSaving(false);
    }
  };

  // Count events
  const eventCount = Object.keys(practicalScores).length;
  const rowCount = Object.values(practicalScores).flat().filter(r => !r.isDeleted).length;

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6">
      {/* Left: University List */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Dumbbell className="w-5 h-5 text-pink-600" />
            </div>
            <h2 className="text-lg font-semibold">실기배점표</h2>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ml-auto px-3 py-1 text-sm border rounded-lg bg-white dark:bg-zinc-700"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-zinc-700"
            />
          </div>

          {/* Initial filter */}
          <div className="flex flex-wrap gap-1 mb-3">
            {KOREAN_CONSONANTS.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedInitial(c)}
                className={`px-2 py-1 text-xs rounded ${
                  selectedInitial === c
                    ? "bg-pink-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Gun filter */}
          <div className="flex gap-1">
            {["전체", "가군", "나군", "다군", "기타"].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGun(g)}
                className={`px-3 py-1 text-xs rounded ${
                  selectedGun === g
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* University list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-zinc-500">로딩 중...</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {filteredUniversities.map((u) => (
                <button
                  key={u.U_ID}
                  onClick={() => loadPracticalScores(u)}
                  className={`w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition ${
                    selectedUniv?.U_ID === u.U_ID ? "bg-pink-50 dark:bg-pink-900/30" : ""
                  }`}
                >
                  <div className="font-medium text-sm text-zinc-900 dark:text-white">
                    [{u.대학명}] {u.학과명}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{normGun(u.군)}</div>
                </button>
              ))}
              {filteredUniversities.length === 0 && (
                <div className="p-4 text-center text-zinc-500">결과 없음</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Practical Scores Edit */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {selectedUniv ? (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                [{selectedUniv.대학명}] {selectedUniv.학과명}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                U_ID: {selectedUniv.U_ID} | {normGun(selectedUniv.군)} | {eventCount}개 종목 / {rowCount}개 행
              </p>
            </div>

            {/* Add new event */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="새 종목명 입력..."
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
                  onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                />
                <button
                  onClick={handleAddEvent}
                  disabled={!newEventName.trim()}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  종목 추가
                </button>
              </div>
            </div>

            {/* Events list */}
            {Object.entries(practicalScores).map(([eventName, rows]) => {
              const visibleRows = rows.filter(r => !r.isDeleted);
              if (visibleRows.length === 0 && rows.some(r => r.isDeleted)) {
                return null; // Hide fully deleted events
              }

              return (
                <div key={eventName} className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{eventName}</h3>
                    <button
                      onClick={() => handleDeleteEvent(eventName)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      title="종목 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-zinc-500 border-b">
                        <th className="text-left py-2 w-24">성별</th>
                        <th className="text-left py-2">기록</th>
                        <th className="text-left py-2 w-32">배점</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.filter(r => !r.isDeleted).map((row, idx) => {
                        const originalIdx = rows.indexOf(row);
                        return (
                          <tr key={originalIdx} className="border-b border-zinc-100 dark:border-zinc-700">
                            <td className="py-2">
                              <select
                                value={row.gender}
                                onChange={(e) => handleUpdateRow(eventName, originalIdx, "gender", e.target.value)}
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-zinc-700"
                              >
                                <option value="남">남</option>
                                <option value="여">여</option>
                                <option value="공통">공통</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={row.record}
                                onChange={(e) => handleUpdateRow(eventName, originalIdx, "record", e.target.value)}
                                placeholder="예: 12.5, 280"
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-zinc-700"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={row.score}
                                onChange={(e) => handleUpdateRow(eventName, originalIdx, "score", Number(e.target.value))}
                                className="w-full px-2 py-1 border rounded bg-white dark:bg-zinc-700"
                              />
                            </td>
                            <td className="py-2 text-center">
                              <button
                                onClick={() => handleDeleteRow(eventName, originalIdx)}
                                className="p-1 text-zinc-400 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <button
                    onClick={() => handleAddRow(eventName)}
                    className="mt-3 text-sm text-pink-600 hover:text-pink-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    행 추가
                  </button>
                </div>
              );
            })}

            {eventCount === 0 && (
              <div className="text-center py-12 text-zinc-500">
                실기배점 데이터가 없습니다. 위에서 종목을 추가하세요.
              </div>
            )}

            {/* Save button */}
            <div className="sticky bottom-4 bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              {message && (
                <span
                  className={`text-sm font-medium ${
                    message.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message.text}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-auto inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-5 h-5" />
                {saving ? "저장 중..." : "모든 변경 저장"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            왼쪽 목록에서 학교를 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}
