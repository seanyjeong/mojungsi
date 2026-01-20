"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Save, ClipboardList, RefreshCw, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

// 과목 목록
const SUBJECTS = {
  주요: ["국어", "수학"],
  사탐: [
    "생활과윤리",
    "윤리와사상",
    "한국지리",
    "세계지리",
    "동아시아사",
    "세계사",
    "경제",
    "정치와법",
    "사회문화",
  ],
  과탐: [
    "물리학I",
    "물리학II",
    "화학I",
    "화학II",
    "생명과학I",
    "생명과학II",
    "지구과학I",
    "지구과학II",
  ],
};

const ALL_SUBJECTS = [...SUBJECTS.주요, ...SUBJECTS.사탐, ...SUBJECTS.과탐];

// 시험 유형
const EXAM_TYPES = ["3월", "6월", "9월", "수능"];

interface GradeCut {
  grade: number;
  raw_score: number | null;
  std_score: number | null;
  percentile: number | null;
}

// 기본 등급컷 템플릿 (1~9등급)
const DEFAULT_GRADE_CUTS: GradeCut[] = Array.from({ length: 9 }, (_, i) => ({
  grade: i + 1,
  raw_score: i === 8 ? 0 : null, // 9등급 원점수 기본 0
  std_score: null,
  percentile: i === 8 ? 0 : null, // 9등급 백분위 기본 0
}));

export default function GradeCutsPage() {
  const [year, setYear] = useState(2027);
  const [examType, setExamType] = useState("수능");
  const [subject, setSubject] = useState("국어");
  const [gradeCuts, setGradeCuts] = useState<GradeCut[]>(DEFAULT_GRADE_CUTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [savedSubjects, setSavedSubjects] = useState<string[]>([]);

  // 엑셀 붙여넣기용 textarea
  const [pasteText, setPasteText] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);

  // 테이블 참조
  const tableRef = useRef<HTMLTableElement>(null);

  // 등급컷 불러오기
  const fetchGradeCuts = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `${API_BASE}/admin/grade-cuts?year=${year}&exam_type=${encodeURIComponent(examType)}&subject=${encodeURIComponent(subject)}`
      );
      const data = await res.json();
      if (data.success) {
        if (data.gradeCuts && data.gradeCuts.length > 0) {
          // 1~9등급 템플릿에 맞춰 데이터 매핑
          const merged = DEFAULT_GRADE_CUTS.map((template) => {
            const found = data.gradeCuts.find((g: GradeCut) => g.grade === template.grade);
            return found || template;
          });
          setGradeCuts(merged);
        } else {
          setGradeCuts(DEFAULT_GRADE_CUTS.map(c => ({ ...c })));
        }
      } else {
        setMessage({ type: "error", text: "데이터 로드 실패" });
      }
    } catch (error) {
      console.error("Failed to fetch grade cuts:", error);
      setMessage({ type: "error", text: "서버 연결 실패" });
    } finally {
      setLoading(false);
    }
  }, [year, examType, subject]);

  // 저장된 과목 목록 불러오기
  const fetchSavedSubjects = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE}/admin/grade-cuts/subjects?year=${year}&exam_type=${encodeURIComponent(examType)}`
      );
      const data = await res.json();
      if (data.success) {
        setSavedSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved subjects:", error);
    }
  }, [year, examType]);

  // 초기 로드 및 필터 변경 시
  useEffect(() => {
    fetchGradeCuts();
    fetchSavedSubjects();
  }, [fetchGradeCuts, fetchSavedSubjects]);

  // 개별 값 변경
  const handleValueChange = (grade: number, field: keyof GradeCut, value: string) => {
    setGradeCuts((prev) =>
      prev.map((cut) =>
        cut.grade === grade
          ? { ...cut, [field]: value === "" ? null : Number(value) }
          : cut
      )
    );
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/grade-cuts/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          exam_type: examType,
          subject,
          gradeCuts: gradeCuts.filter(
            (c) => c.raw_score !== null || c.std_score !== null || c.percentile !== null
          ),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message || "저장 완료" });
        fetchSavedSubjects(); // 저장된 과목 목록 갱신
      } else {
        setMessage({ type: "error", text: data.message || "저장 실패" });
      }
    } catch (error) {
      console.error("Failed to save:", error);
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSaving(false);
    }
  };

  // 엑셀 붙여넣기 파싱
  const handlePaste = () => {
    if (!pasteText.trim()) {
      setMessage({ type: "error", text: "붙여넣을 데이터가 없습니다" });
      return;
    }

    try {
      const lines = pasteText.trim().split("\n");
      const newCuts: GradeCut[] = [];

      for (const line of lines) {
        const cells = line.split("\t");
        if (cells.length >= 3) {
          // 최소 3열 (원점수, 표점, 백분위)
          const raw = cells[0]?.trim();
          const std = cells[1]?.trim();
          const pct = cells[2]?.trim();

          // 등급 열이 있는 경우 (4열)
          const grade = cells.length >= 4 ? parseInt(cells[3]?.trim() || "0") : newCuts.length + 1;

          if (grade >= 1 && grade <= 9) {
            newCuts.push({
              grade,
              raw_score: raw ? parseFloat(raw) : null,
              std_score: std ? parseFloat(std) : null,
              percentile: pct ? parseFloat(pct) : null,
            });
          }
        }
      }

      if (newCuts.length > 0) {
        // 기존 템플릿에 매핑
        const merged = DEFAULT_GRADE_CUTS.map((template) => {
          const found = newCuts.find((c) => c.grade === template.grade);
          return found || template;
        });
        setGradeCuts(merged);
        setMessage({ type: "success", text: `${newCuts.length}개 등급 데이터 적용됨` });
        setShowPasteArea(false);
        setPasteText("");
      } else {
        setMessage({ type: "error", text: "유효한 데이터가 없습니다" });
      }
    } catch (error) {
      console.error("Parse error:", error);
      setMessage({ type: "error", text: "데이터 파싱 오류" });
    }
  };

  // 테이블 직접 붙여넣기 (input에서 Ctrl+V)
  const handleTablePaste = (e: React.ClipboardEvent<HTMLInputElement>, startGrade: number, startField: keyof GradeCut) => {
    const clipboardData = e.clipboardData.getData("text");
    if (!clipboardData.includes("\t") && !clipboardData.includes("\n")) {
      // 단일 값이면 기본 동작
      return;
    }

    e.preventDefault();
    const lines = clipboardData.trim().split("\n");
    const fields: (keyof GradeCut)[] = ["raw_score", "std_score", "percentile"];
    const startFieldIndex = fields.indexOf(startField);

    setGradeCuts((prev) => {
      const newCuts = [...prev];
      lines.forEach((line, rowOffset) => {
        const cells = line.split("\t");
        cells.forEach((cell, colOffset) => {
          const targetGrade = startGrade + rowOffset;
          const targetFieldIndex = startFieldIndex + colOffset;
          if (targetGrade >= 1 && targetGrade <= 9 && targetFieldIndex >= 0 && targetFieldIndex < 3) {
            const targetField = fields[targetFieldIndex];
            const cutIndex = newCuts.findIndex((c) => c.grade === targetGrade);
            if (cutIndex !== -1) {
              newCuts[cutIndex] = {
                ...newCuts[cutIndex],
                [targetField]: cell.trim() === "" ? null : parseFloat(cell.trim()),
              };
            }
          }
        });
      });
      return newCuts;
    });

    setMessage({ type: "success", text: "데이터가 붙여넣어졌습니다" });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">예상 등급컷 관리</h1>
            <p className="text-sm text-zinc-500">시험별 과목 등급컷을 입력합니다</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">학년도</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">시험</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
            >
              {EXAM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "수능" ? "수능" : `${type} 모의평가`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">과목</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
            >
              <optgroup label="주요">
                {SUBJECTS.주요.map((s) => (
                  <option key={s} value={s}>
                    {s} {savedSubjects.includes(s) ? "  ✓" : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="사회탐구">
                {SUBJECTS.사탐.map((s) => (
                  <option key={s} value={s}>
                    {s} {savedSubjects.includes(s) ? "  ✓" : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="과학탐구">
                {SUBJECTS.과탐.map((s) => (
                  <option key={s} value={s}>
                    {s} {savedSubjects.includes(s) ? "  ✓" : ""}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchGradeCuts}
              disabled={loading}
              className="px-4 py-2 border rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              불러오기
            </button>
          </div>
        </div>
      </div>

      {/* 저장된 과목 표시 */}
      {savedSubjects.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4 text-sm">
          <span className="font-medium text-green-700 dark:text-green-400">
            저장된 과목 ({savedSubjects.length}):
          </span>{" "}
          <span className="text-green-600 dark:text-green-300">
            {savedSubjects.join(", ")}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && <div className="text-center py-12 text-zinc-500">로딩 중...</div>}

      {/* Grade Cuts Table */}
      {!loading && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden mb-6">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
            <h3 className="font-semibold">
              {year}학년도 {examType} - {subject} 등급컷
            </h3>
            <button
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="text-sm px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600"
            >
              {showPasteArea ? "테이블 입력" : "엑셀 붙여넣기"}
            </button>
          </div>

          {/* 엑셀 붙여넣기 영역 */}
          {showPasteArea && (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                엑셀에서 복사한 데이터를 붙여넣으세요. (열 순서: 원점수, 표준점수, 백분위)
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="엑셀에서 Ctrl+V로 붙여넣기..."
                className="w-full h-32 p-3 border rounded-lg bg-white dark:bg-zinc-800 font-mono text-sm"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handlePaste}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  적용
                </button>
                <button
                  onClick={() => {
                    setPasteText("");
                    setShowPasteArea(false);
                  }}
                  className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 테이블 */}
          <table ref={tableRef} className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-20">등급</th>
                <th className="px-4 py-3 text-center font-medium">원점수</th>
                <th className="px-4 py-3 text-center font-medium">표준점수</th>
                <th className="px-4 py-3 text-center font-medium">백분위</th>
              </tr>
            </thead>
            <tbody>
              {gradeCuts.map((cut) => (
                <tr
                  key={cut.grade}
                  className="border-t border-zinc-200 dark:border-zinc-700"
                >
                  <td className="px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300">
                    {cut.grade}등급
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={cut.raw_score ?? ""}
                      onChange={(e) => handleValueChange(cut.grade, "raw_score", e.target.value)}
                      onPaste={(e) => handleTablePaste(e, cut.grade, "raw_score")}
                      className="w-24 p-2 border rounded text-center bg-white dark:bg-zinc-700"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={cut.std_score ?? ""}
                      onChange={(e) => handleValueChange(cut.grade, "std_score", e.target.value)}
                      onPaste={(e) => handleTablePaste(e, cut.grade, "std_score")}
                      className="w-24 p-2 border rounded text-center bg-white dark:bg-zinc-700"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={cut.percentile ?? ""}
                      onChange={(e) => handleValueChange(cut.grade, "percentile", e.target.value)}
                      onPaste={(e) => handleTablePaste(e, cut.grade, "percentile")}
                      className="w-24 p-2 border rounded text-center bg-white dark:bg-zinc-700"
                      placeholder="-"
                      min={0}
                      max={100}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save Button */}
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
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
