"use client";

import { useState, useEffect } from "react";
import { Search, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

interface RatioData {
  U_ID: number;
  학년도: number;
  총점: number;
  수능비율: string;
  실기비율: string;
  실기총점: number;
  국어: number;
  수학: number;
  영어: number;
  탐구: number;
  탐구수: number;
  영어등급배점: Record<string, number>;
  한국사등급배점: Record<string, number>;
}

export default function RatiosPage() {
  const [year, setYear] = useState(2026);
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [selectedInitial, setSelectedInitial] = useState("ㄱ");
  const [selectedGun, setSelectedGun] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [ratioData, setRatioData] = useState<RatioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Main ratio state
  const [suneung, setSuneung] = useState("100");
  const [naeshin, setNaeshin] = useState("0");
  const [silgi, setSilgi] = useState("0");
  const [silgiTotal, setSilgiTotal] = useState(0);

  // Subject ratio state
  const [korean, setKorean] = useState(0);
  const [math, setMath] = useState(0);
  const [english, setEnglish] = useState(0);
  const [tamgu, setTamgu] = useState(0);
  const [tamguCnt, setTamguCnt] = useState(2);

  // Grade scores state
  const [englishScores, setEnglishScores] = useState<Record<string, number>>({});
  const [historyScores, setHistoryScores] = useState<Record<string, number>>({});

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

  // Load ratio data
  const loadRatioData = async (univ: University) => {
    setSelectedUniv(univ);
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/ratio/${univ.U_ID}`);
      const data = await res.json();
      if (data.success) {
        const ratio = data.data;
        setRatioData(ratio);

        // Populate form
        setSuneung(ratio.수능비율 || "100");
        setNaeshin("0"); // Not in current data
        setSilgi(ratio.실기비율 || "0");
        setSilgiTotal(ratio.실기총점 || 0);

        setKorean(ratio.국어 || 0);
        setMath(ratio.수학 || 0);
        setEnglish(ratio.영어 || 0);
        setTamgu(ratio.탐구 || 0);
        setTamguCnt(ratio.탐구수 || 2);

        setEnglishScores(ratio.영어등급배점 || {});
        setHistoryScores(ratio.한국사등급배점 || {});
      }
    } catch (error) {
      console.error("Failed to load ratio data:", error);
    }
  };

  // Save main ratios
  const saveMainRatios = async () => {
    if (!selectedUniv) return;
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/ratio/${selectedUniv.U_ID}/main-ratios`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suneung,
          naeshin,
          silgi,
          silgi_total: silgiTotal,
        }),
      });
      return (await res.json()).success;
    } catch {
      return false;
    }
  };

  // Save subject ratios
  const saveSubjectRatios = async () => {
    if (!selectedUniv) return;
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/ratio/${selectedUniv.U_ID}/subjects`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          국어: korean,
          수학: math,
          영어: english,
          탐구: tamgu,
          탐구수: tamguCnt,
        }),
      });
      return (await res.json()).success;
    } catch {
      return false;
    }
  };

  // Save english scores
  const saveEnglishScores = async () => {
    if (!selectedUniv || Object.keys(englishScores).length === 0) return true;
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/ratio/${selectedUniv.U_ID}/english-scores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(englishScores),
      });
      return (await res.json()).success;
    } catch {
      return false;
    }
  };

  // Save history scores
  const saveHistoryScores = async () => {
    if (!selectedUniv || Object.keys(historyScores).length === 0) return true;
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/ratio/${selectedUniv.U_ID}/history-scores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyScores),
      });
      return (await res.json()).success;
    } catch {
      return false;
    }
  };

  // Save all
  const handleSave = async () => {
    if (!selectedUniv) return;
    setSaving(true);
    setMessage(null);

    try {
      const results = await Promise.all([
        saveMainRatios(),
        saveSubjectRatios(),
        saveEnglishScores(),
        saveHistoryScores(),
      ]);

      if (results.every(Boolean)) {
        setMessage({ type: "success", text: "모든 비율이 저장되었습니다." });
      } else {
        setMessage({ type: "error", text: "일부 저장에 실패했습니다." });
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  // Calculate total subject ratio
  const totalSubjectRatio = korean + math + english + tamgu;

  return (
    <div className="flex h-[calc(100vh-80px)] gap-6">
      {/* Left: University List */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/setting"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-lg font-semibold">비율 설정</h2>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ml-auto px-3 py-1 text-sm border rounded-lg bg-white dark:bg-zinc-700"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
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
                    ? "bg-blue-600 text-white"
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
                  onClick={() => loadRatioData(u)}
                  className={`w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition ${
                    selectedUniv?.U_ID === u.U_ID ? "bg-blue-50 dark:bg-blue-900/30" : ""
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

      {/* Right: Edit Form */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {selectedUniv && ratioData ? (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                [{selectedUniv.대학명}] {selectedUniv.학과명}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                U_ID: {selectedUniv.U_ID} | {normGun(selectedUniv.군)} | 총점: {ratioData.총점}점
              </p>
            </div>

            {/* 수능/내신/실기 비율 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">수능 / 내신 / 실기 비율</h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">수능 (%)</label>
                  <input
                    type="number"
                    value={suneung}
                    onChange={(e) => setSuneung(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">내신 (%)</label>
                  <input
                    type="number"
                    value={naeshin}
                    onChange={(e) => setNaeshin(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">실기 (%)</label>
                  <input
                    type="number"
                    value={silgi}
                    onChange={(e) => setSilgi(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">실기 만점</label>
                  <input
                    type="number"
                    value={silgiTotal}
                    onChange={(e) => setSilgiTotal(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
              </div>
            </div>

            {/* 과목별 비율 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">
                과목별 비율
                <span className={`ml-2 text-sm font-normal ${totalSubjectRatio === 100 ? "text-green-600" : "text-red-600"}`}>
                  (합계: {totalSubjectRatio}%)
                </span>
              </h3>
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">국어 (%)</label>
                  <input
                    type="number"
                    value={korean}
                    onChange={(e) => setKorean(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">수학 (%)</label>
                  <input
                    type="number"
                    value={math}
                    onChange={(e) => setMath(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">영어 (%)</label>
                  <input
                    type="number"
                    value={english}
                    onChange={(e) => setEnglish(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">탐구 (%)</label>
                  <input
                    type="number"
                    value={tamgu}
                    onChange={(e) => setTamgu(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">탐구 과목수</label>
                  <select
                    value={tamguCnt}
                    onChange={(e) => setTamguCnt(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  >
                    <option value={1}>1개</option>
                    <option value={2}>2개</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 영어 등급별 배점 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">영어 등급별 배점</h3>
              <div className="grid grid-cols-9 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                  <div key={grade} className="text-center">
                    <label className="block text-xs font-medium mb-1">{grade}등급</label>
                    <input
                      type="number"
                      value={englishScores[grade] ?? ""}
                      onChange={(e) =>
                        setEnglishScores({ ...englishScores, [grade]: Number(e.target.value) })
                      }
                      className="w-full p-2 border rounded-lg text-center text-sm bg-white dark:bg-zinc-700"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 한국사 등급별 배점 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">한국사 등급별 배점</h3>
              <div className="grid grid-cols-9 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                  <div key={grade} className="text-center">
                    <label className="block text-xs font-medium mb-1">{grade}등급</label>
                    <input
                      type="number"
                      value={historyScores[grade] ?? ""}
                      onChange={(e) =>
                        setHistoryScores({ ...historyScores, [grade]: Number(e.target.value) })
                      }
                      className="w-full p-2 border rounded-lg text-center text-sm bg-white dark:bg-zinc-700"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Save button */}
            <div className="sticky bottom-0 bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
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
                {saving ? "저장 중..." : "모든 비율 저장"}
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
