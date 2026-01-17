"use client";

import { useState, useEffect } from "react";
import { Search, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
  형태?: string;
  광역?: string;
  시구?: string;
  모집정원?: string;
}

export default function BasicInfoPage() {
  const [year, setYear] = useState(2026);
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [selectedInitial, setSelectedInitial] = useState("ㄱ");
  const [selectedGun, setSelectedGun] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit form state
  const [editUnivName, setEditUnivName] = useState("");
  const [editDeptName, setEditDeptName] = useState("");
  const [editGun, setEditGun] = useState("");
  const [editHyungtae, setEditHyungtae] = useState("");
  const [editMojip, setEditMojip] = useState("");

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

    // Filter by initial
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

    // Filter by gun
    if (selectedGun !== "전체") {
      filtered = filtered.filter((u) => normGun(u.군) === selectedGun);
    }

    // Filter by search
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

  // Load selected university details
  const loadUnivDetails = async (univ: University) => {
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/basic/${univ.U_ID}`);
      const data = await res.json();
      if (data.success) {
        const basic = data.data;
        setSelectedUniv(basic);
        setEditUnivName(basic.univ_name || "");
        setEditDeptName(basic.dept_name || "");
        setEditGun(basic.gun || "");
        setEditHyungtae(basic.hyungtae || "");
        setEditMojip(basic.mojip || "");
      }
    } catch (error) {
      console.error("Failed to load university details:", error);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedUniv) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/basic/${selectedUniv.U_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          univ_name: editUnivName,
          dept_name: editDeptName,
          gun: editGun,
          hyungtae: editHyungtae,
          mojip: editMojip,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "저장되었습니다." });
        // Update local list
        setUniversities((prev) =>
          prev.map((u) =>
            u.U_ID === selectedUniv.U_ID
              ? { ...u, 대학명: editUnivName, 학과명: editDeptName, 군: editGun }
              : u
          )
        );
      } else {
        setMessage({ type: "error", text: "저장에 실패했습니다." });
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

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
            <h2 className="text-lg font-semibold">기본정보 수정</h2>
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
                  onClick={() => loadUnivDetails(u)}
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
      <div className="flex-1 overflow-y-auto">
        {selectedUniv ? (
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-bold mb-6">기본정보 수정</h2>
            <p className="text-sm text-zinc-500 mb-6">U_ID: {selectedUniv.U_ID}</p>

            <div className="space-y-6">
              {/* 대학명 */}
              <div>
                <label className="block text-sm font-medium mb-2">대학명</label>
                <input
                  type="text"
                  value={editUnivName}
                  onChange={(e) => setEditUnivName(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                />
              </div>

              {/* 학과명 */}
              <div>
                <label className="block text-sm font-medium mb-2">학과명</label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                />
              </div>

              {/* 군 */}
              <div>
                <label className="block text-sm font-medium mb-2">군</label>
                <select
                  value={editGun}
                  onChange={(e) => setEditGun(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                >
                  <option value="가">가군</option>
                  <option value="나">나군</option>
                  <option value="다">다군</option>
                  <option value="">미정</option>
                </select>
              </div>

              {/* 형태 */}
              <div>
                <label className="block text-sm font-medium mb-2">형태</label>
                <select
                  value={editHyungtae}
                  onChange={(e) => setEditHyungtae(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                >
                  <option value="4년제">4년제</option>
                  <option value="전문대">전문대</option>
                  <option value="교육대">교육대</option>
                  <option value="산업대">산업대</option>
                  <option value="">기타</option>
                </select>
              </div>

              {/* 모집정원 */}
              <div>
                <label className="block text-sm font-medium mb-2">모집정원</label>
                <input
                  type="text"
                  value={editMojip}
                  onChange={(e) => setEditMojip(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700"
                  placeholder="예: 30"
                />
              </div>
            </div>

            {/* Save button */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-5 h-5" />
                {saving ? "저장 중..." : "저장"}
              </button>
              {message && (
                <span
                  className={`text-sm font-medium ${
                    message.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message.text}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            왼쪽 목록에서 학교를 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}
