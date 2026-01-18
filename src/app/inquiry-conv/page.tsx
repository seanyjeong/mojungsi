"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Save, BookOpen, Download, Upload, Filter } from "lucide-react";
import * as XLSX from "xlsx";

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

interface UniversityWithConv extends University {
  사탐_count: number;
  과탐_count: number;
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
  const [universitiesWithConv, setUniversitiesWithConv] = useState<UniversityWithConv[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [selectedInitial, setSelectedInitial] = useState("ㄱ");
  const [selectedGun, setSelectedGun] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [showOnlyWithConv, setShowOnlyWithConv] = useState(true); // 변환표 있는 학교만 보기

  const [convData, setConvData] = useState<InquiryConvData | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<"사탐" | "과탐">("사탐");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Load universities with conversion data
  useEffect(() => {
    const fetchUniversitiesWithConv = async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/jungsi/inquiry-conv-list?year=${year}`);
        const data = await res.json();
        if (data.success) {
          setUniversitiesWithConv(data.list || []);
        }
      } catch (error) {
        console.error("Failed to fetch universities with conv:", error);
      }
    };
    fetchUniversitiesWithConv();
  }, [year]);

  // Load all universities
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
    // 변환표 있는 학교만 보기가 켜져 있으면 해당 목록 사용
    let baseList: University[] = showOnlyWithConv
      ? universitiesWithConv.map(u => ({
          U_ID: u.U_ID,
          대학명: u.대학명,
          학과명: u.학과명,
          군: u.군
        }))
      : universities;

    let filtered = baseList;

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
  }, [universities, universitiesWithConv, selectedInitial, selectedGun, searchTerm, showOnlyWithConv]);

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
        // Refresh universities with conv list
        const listRes = await fetch(`${API_BASE}/admin/jungsi/inquiry-conv-list?year=${year}`);
        const listData = await listRes.json();
        if (listData.success) {
          setUniversitiesWithConv(listData.list || []);
        }
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

  // 엑셀 다운로드
  const handleExcelDownload = async () => {
    try {
      // 전체 데이터 또는 선택된 학교 데이터
      const uid = selectedUniv?.U_ID;
      const url = uid
        ? `${API_BASE}/admin/jungsi/inquiry-conv-export?year=${year}&uid=${uid}`
        : `${API_BASE}/admin/jungsi/inquiry-conv-export?year=${year}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!json.success || !json.data.length) {
        alert("다운로드할 데이터가 없습니다.");
        return;
      }

      // 데이터를 엑셀 형식으로 변환
      const wsData = json.data.map((row: {
        U_ID: number;
        대학명: string;
        학과명: string;
        계열: string;
        백분위: number;
        변환표준점수: number;
      }) => ({
        U_ID: row.U_ID,
        대학명: row.대학명,
        학과명: row.학과명,
        계열: row.계열,
        백분위: row.백분위,
        변환표준점수: row.변환표준점수
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "탐구변환표");

      // 컬럼 너비 설정
      ws["!cols"] = [
        { wch: 8 },  // U_ID
        { wch: 20 }, // 대학명
        { wch: 25 }, // 학과명
        { wch: 8 },  // 계열
        { wch: 8 },  // 백분위
        { wch: 12 }  // 변환표준점수
      ];

      const fileName = uid
        ? `탐구변환표_${selectedUniv?.대학명}_${selectedUniv?.학과명}_${year}.xlsx`
        : `탐구변환표_전체_${year}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Excel download error:", error);
      alert("엑셀 다운로드 중 오류가 발생했습니다.");
    }
  };

  // 엑셀 업로드
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<{
        U_ID: number;
        대학명?: string;
        학과명?: string;
        계열: string;
        백분위: number;
        변환표준점수: number;
      }>(sheet);

      if (!jsonData.length) {
        alert("데이터가 없습니다.");
        setUploading(false);
        return;
      }

      // 데이터 변환 및 검증
      const importData = jsonData
        .filter(row => row.U_ID && row.계열 && row.백분위 !== undefined && row.변환표준점수)
        .map(row => ({
          U_ID: Number(row.U_ID),
          계열: String(row.계열).trim(),
          백분위: Number(row.백분위),
          변환표준점수: Number(row.변환표준점수)
        }));

      if (!importData.length) {
        alert("유효한 데이터가 없습니다. U_ID, 계열, 백분위, 변환표준점수 컬럼을 확인하세요.");
        setUploading(false);
        return;
      }

      // API 호출
      const res = await fetch(`${API_BASE}/admin/jungsi/inquiry-conv-import?year=${year}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: importData })
      });

      const result = await res.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: `업로드 완료: ${result.inserted}건 추가, ${result.updated}건 수정${result.errors?.length ? `, ${result.errors.length}건 오류` : ""}`
        });

        // 목록 새로고침
        const listRes = await fetch(`${API_BASE}/admin/jungsi/inquiry-conv-list?year=${year}`);
        const listData = await listRes.json();
        if (listData.success) {
          setUniversitiesWithConv(listData.list || []);
        }

        // 선택된 학교가 있으면 데이터 새로고침
        if (selectedUniv) {
          loadConvData(selectedUniv);
        }
      } else {
        setMessage({ type: "error", text: "업로드 실패" });
      }
    } catch (error) {
      console.error("Excel upload error:", error);
      setMessage({ type: "error", text: "엑셀 업로드 중 오류 발생" });
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Generate percentile range (0-100)
  const percentiles = Array.from({ length: 101 }, (_, i) => i);
  const currentScores = convData?.[selectedTrack] || {};
  const filledCount = Object.keys(currentScores).length;

  // 선택된 학교의 변환표 정보
  const selectedConvInfo = universitiesWithConv.find(u => u.U_ID === selectedUniv?.U_ID);

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

          {/* 엑셀 다운로드/업로드 버튼 */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleExcelDownload}
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Download className="w-4 h-4" />
              엑셀 다운로드
            </button>
            <label className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? "업로드 중..." : "엑셀 업로드"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* 변환표 있는 학교만 보기 */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithConv}
              onChange={(e) => setShowOnlyWithConv(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
            />
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              변환표 있는 학교만 ({universitiesWithConv.length}개)
            </span>
          </label>

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
              {filteredUniversities.map((u) => {
                const convInfo = universitiesWithConv.find(c => c.U_ID === u.U_ID);
                return (
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">{normGun(u.군)}</span>
                      {convInfo && (
                        <span className="text-xs text-cyan-600">
                          사탐:{convInfo.사탐_count} | 과탐:{convInfo.과탐_count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    [{selectedUniv.대학명}] {selectedUniv.학과명}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    U_ID: {selectedUniv.U_ID} | {normGun(selectedUniv.군)} | {selectedTrack} 입력됨: {filledCount}/101
                  </p>
                </div>
                <button
                  onClick={handleExcelDownload}
                  className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  이 학교 다운로드
                </button>
              </div>
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
                <br />
                <strong>엑셀 업로드 형식:</strong> U_ID, 대학명, 학과명, 계열(사탐/과탐), 백분위, 변환표준점수
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
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <BookOpen className="w-12 h-12 mb-4 opacity-50" />
            <p>왼쪽 목록에서 학교를 선택하세요.</p>
            <p className="text-sm mt-2">
              또는 엑셀 파일을 업로드하여 일괄 입력하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
