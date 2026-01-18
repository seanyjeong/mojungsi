"use client";

import { useState, useEffect } from "react";
import { Search, Save, BookOpen } from "lucide-react";

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

interface InquiryConvData {
  U_ID: number;
  year: number;
  사탐: Record<number, number>;
  과탐: Record<number, number>;
}

export default function InquiryConvPage() {
  const [year, setYear] = useState(2027);
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [selectedInitial, setSelectedInitial] = useState("ㄱ");
  const [selectedGun, setSelectedGun] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);

  const [convData, setConvData] = useState<InquiryConvData | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<"사탐" | "과탐">("사탐");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Load inquiry conv data
  const loadConvData = async (univ: University) => {
    setSelectedUniv(univ);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/inquiry-conv/${univ.U_ID}?year=${year}`);
      const data = await res.json();
      if (data.success) {
        setConvData(data.data);
      } else {
        // Initialize empty data
        setConvData({
          U_ID: univ.U_ID,
          year,
          사탐: {},
          과탐: {}
        });
      }
    } catch (error) {
      console.error("Failed to load conv data:", error);
      setConvData({
        U_ID: univ.U_ID,
        year,
        사탐: {},
        과탐: {}
      });
    }
  };

  // Update score
  const handleScoreChange = (percentile: number, value: number) => {
    if (!convData) return;
    setConvData({
      ...convData,
      [selectedTrack]: {
        ...convData[selectedTrack],
        [percentile]: value
      }
    });
  };

  // Save
  const handleSave = async () => {
    if (!selectedUniv || !convData) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/inquiry-conv/${selectedUniv.U_ID}?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: selectedTrack,
          scores: convData[selectedTrack]
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: `${selectedTrack} 변환표 저장 완료` });
      } else {
        setMessage({ type: "error", text: "저장 실패" });
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSaving(false);
    }
  };

  // Generate percentile range (0-100)
  const percentiles = Array.from({ length: 101 }, (_, i) => i);
  const currentScores = convData?.[selectedTrack] || {};
  const filledCount = Object.keys(currentScores).length;

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6">
      {/* Left: University List */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-cyan-600" />
            </div>
            <h2 className="text-lg font-semibold">탐구 변환표</h2>
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
                    ? "bg-cyan-600 text-white"
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
                  onClick={() => loadConvData(u)}
                  className={`w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition ${
                    selectedUniv?.U_ID === u.U_ID ? "bg-cyan-50 dark:bg-cyan-900/30" : ""
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

      {/* Right: Conversion Table Edit */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {selectedUniv && convData ? (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                [{selectedUniv.대학명}] {selectedUniv.학과명}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                U_ID: {selectedUniv.U_ID} | {normGun(selectedUniv.군)} | {selectedTrack} 입력됨: {filledCount}/101
              </p>
            </div>

            {/* Track selector */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTrack("사탐")}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${
                    selectedTrack === "사탐"
                      ? "bg-cyan-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  사회탐구
                  <span className="ml-2 text-sm opacity-70">
                    ({Object.keys(convData.사탐 || {}).length}/101)
                  </span>
                </button>
                <button
                  onClick={() => setSelectedTrack("과탐")}
                  className={`flex-1 py-3 rounded-lg font-medium transition ${
                    selectedTrack === "과탐"
                      ? "bg-cyan-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  과학탐구
                  <span className="ml-2 text-sm opacity-70">
                    ({Object.keys(convData.과탐 || {}).length}/101)
                  </span>
                </button>
              </div>
            </div>

            {/* Conversion table */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">{selectedTrack} 백분위 → 변환표준점수</h3>

              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {percentiles.map((p) => (
                  <div key={p} className="text-center">
                    <label className="block text-xs font-medium mb-1 text-zinc-500">{p}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentScores[p] ?? ""}
                      onChange={(e) => handleScoreChange(p, parseFloat(e.target.value) || 0)}
                      placeholder="-"
                      className="w-full p-1 text-sm border rounded text-center bg-white dark:bg-zinc-700"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick fill hint */}
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>TIP:</strong> 백분위 0~100까지의 변환표준점수를 입력합니다.
                주로 대학교에서 공개하는 탐구 변환표준점수표를 참고하세요.
              </p>
            </div>

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
                {saving ? "저장 중..." : `${selectedTrack} 변환표 저장`}
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
