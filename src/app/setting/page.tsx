"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Save, Plus, Trash2, ChevronDown, ChevronUp, FileSpreadsheet, Settings2, Percent } from "lucide-react";
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
  selection_rules?: any;
  bonus_rules?: any;
  score_config?: any;
  계산유형?: string;
}

interface SchoolData {
  U_ID: number;
  대학명: string;
  학과명: string;
  군: string;
  계산유형: string;
  계산방식: string;
  총점: number;
  특수공식: string;
  score_config: any;
  selection_rules: any;
  bonus_rules: any;
  english_scores: any;
  history_scores: any;
  기타설정: any;
  기타: string;
}

interface SelectionRule {
  type: "select_n" | "select_ranked_weights";
  from: string[];
  count?: number;
  weights?: number[];
}

interface BonusRule {
  type: string;
  subjects: string[];
  value: number;
}

export default function SettingPage() {
  const [year, setYear] = useState(2026);
  const [universities, setUniversities] = useState<University[]>([]);
  const [filteredUniversities, setFilteredUniversities] = useState<University[]>([]);
  const [selectedInitial, setSelectedInitial] = useState("ㄱ");
  const [selectedGun, setSelectedGun] = useState("전체");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [formulaType, setFormulaType] = useState("기본비율");
  const [specialFormula, setSpecialFormula] = useState("");
  const [calcMethod, setCalcMethod] = useState("환산");
  const [totalScore, setTotalScore] = useState(1000);
  const [customTotal, setCustomTotal] = useState("");

  // Score config
  const [kmType, setKmType] = useState("백분위");
  const [kmMaxMethod, setKmMaxMethod] = useState("fixed_200");
  const [engType, setEngType] = useState("grade_conversion");
  const [engMaxScore, setEngMaxScore] = useState(100);
  const [inqType, setInqType] = useState("백분위");
  const [inqMaxMethod, setInqMaxMethod] = useState("fixed_100");

  // English/History scores
  const [englishScores, setEnglishScores] = useState<Record<string, number>>({});
  const [historyScores, setHistoryScores] = useState<Record<string, number>>({});

  // Selection/Bonus rules
  const [selectionRules, setSelectionRules] = useState<SelectionRule[]>([]);
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);

  // Other settings
  const [historyFirst, setHistoryFirst] = useState(false);
  const [etcNote, setEtcNote] = useState("");

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    calcType: true,
    scoreConfig: true,
    englishScores: false,
    historyScores: false,
    selectionRules: true,
    bonusRules: false,
    otherSettings: false,
  });

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
        // Map similar consonants
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

  // Load school details
  const loadSchoolDetails = async (uid: number) => {
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/details/${uid}?year=${year}`);
      const data = await res.json();
      if (data.success) {
        const details = data.data;
        const basic = details.기본정보 || {};
        const ratio = details.반영비율 || {};

        setSelectedSchool({
          U_ID: basic.U_ID,
          대학명: basic.대학명,
          학과명: basic.학과명,
          군: basic.군,
          계산유형: ratio.calc_type || "기본비율",
          계산방식: ratio.calc_method || "환산",
          총점: ratio.총점 || 1000,
          특수공식: ratio.특수공식 || "",
          score_config: ratio.score_config || {},
          selection_rules: ratio.선택반영규칙 || [],
          bonus_rules: ratio.가산점규칙 || [],
          english_scores: ratio.영어등급배점 || {},
          history_scores: ratio.한국사등급배점 || {},
          기타설정: {},
          기타: "",
        });

        // Populate form
        setFormulaType(ratio.calc_type || "기본비율");
        setSpecialFormula(ratio.특수공식 || "");
        setCalcMethod(ratio.calc_method || "환산");
        setTotalScore(ratio.총점 || 1000);
        setEtcNote("");

        // Score config
        const config = ratio.score_config || {};
        setKmType(config.korean_math?.type || "백분위");
        setKmMaxMethod(config.korean_math?.max_score_method || "fixed_200");
        setEngType(config.english?.type || "grade_conversion");
        setEngMaxScore(config.english?.max_score || 100);
        setInqType(config.inquiry?.type || "백분위");
        setInqMaxMethod(config.inquiry?.max_score_method || "fixed_100");

        // English/History scores
        setEnglishScores(ratio.영어등급배점 || {});
        setHistoryScores(ratio.한국사등급배점 || {});

        // Selection rules
        const selRules = ratio.선택반영규칙;
        if (selRules) {
          setSelectionRules(Array.isArray(selRules) ? selRules : [selRules]);
        } else {
          setSelectionRules([]);
        }

        // Bonus rules
        const bonRules = ratio.가산점규칙;
        if (bonRules) {
          setBonusRules(Array.isArray(bonRules) ? bonRules : [bonRules]);
        } else {
          setBonusRules([]);
        }

        // Other settings
        setHistoryFirst(false);
      }
    } catch (error) {
      console.error("Failed to load school details:", error);
    }
  };

  // Save all settings
  const handleSave = async () => {
    if (!selectedSchool) return;
    setSaving(true);
    setMessage(null);

    const uid = selectedSchool.U_ID;

    try {
      const scoreConfig = {
        korean_math: { type: kmType, ...(kmType === "표준점수" && { max_score_method: kmMaxMethod }) },
        english: { type: engType, ...(engType === "fixed_max_score" && { max_score: engMaxScore }) },
        inquiry: { type: inqType, ...(["표준점수", "변환표준점수"].includes(inqType) && { max_score_method: inqMaxMethod }) },
      };

      const finalTotal = totalScore === -1 ? parseInt(customTotal) : totalScore;
      const finalSelectionRules = selectionRules.length === 0 ? [] : selectionRules;
      const finalBonusRules = bonusRules.length === 0 ? [] : bonusRules;
      const otherSettings = { 한국사우선적용: historyFirst };

      // Save all in parallel using PUT endpoints
      const results = await Promise.all([
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/calc-method`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calc_type: formulaType, calc_method: calcMethod }),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/selection-rules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalSelectionRules),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/bonus-rules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalBonusRules),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/score-config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scoreConfig),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/special-formula`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formula: formulaType === "특수공식" ? specialFormula : null }),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/total`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ total_score: finalTotal }),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/etc-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(otherSettings),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/english-scores`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(englishScores),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/history-scores`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(historyScores),
        }),
        fetch(`${API_BASE}/admin/jungsi/ratio/${uid}/etc-note`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: etcNote }),
        }),
      ]);

      const responses = await Promise.all(results.map(r => r.json()));
      const allSuccess = responses.every(r => r.success);

      if (allSuccess) {
        setMessage({ type: "success", text: "모든 설정이 저장되었습니다." });
      } else {
        const failed = responses.filter(r => !r.success);
        console.error("Failed responses:", failed);
        setMessage({ type: "error", text: "일부 설정 저장에 실패했습니다." });
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setSaving(false);
    }
  };

  // Toggle section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Add selection rule
  const addSelectionRule = () => {
    setSelectionRules([...selectionRules, { type: "select_n", from: [], count: 1 }]);
  };

  // Add bonus rule
  const addBonusRule = () => {
    setBonusRules([...bonusRules, { type: "percent_bonus", subjects: [], value: 0 }]);
  };

  // Section header component
  const SectionHeader = ({ title, section, expanded }: { title: string; section: keyof typeof expandedSections; expanded: boolean }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
    >
      <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
      {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
    </button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-4">
      {/* Quick navigation */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <span className="text-sm font-medium text-zinc-500">바로가기:</span>
        <Link
          href="/setting/basic"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition"
        >
          <Settings2 className="w-4 h-4" />
          기본정보 수정
        </Link>
        <Link
          href="/setting/ratios"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition"
        >
          <Percent className="w-4 h-4" />
          비율 설정
        </Link>
        <Link
          href="/setting/bulk"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          엑셀 일괄 수정
        </Link>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
      {/* Left: University List */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">대학 목록</h2>
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
                  onClick={() => loadSchoolDetails(u.U_ID)}
                  className={`w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition ${
                    selectedSchool?.U_ID === u.U_ID ? "bg-blue-50 dark:bg-blue-900/30" : ""
                  } ${u.selection_rules || u.score_config ? "bg-green-50 dark:bg-green-900/20" : ""}`}
                >
                  <div className="font-medium text-sm text-zinc-900 dark:text-white">
                    [{u.대학명}] {u.학과명}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {normGun(u.군)}
                    {(u.selection_rules || u.score_config) && (
                      <span className="ml-2 text-green-600 dark:text-green-400">설정됨</span>
                    )}
                  </div>
                </button>
              ))}
              {filteredUniversities.length === 0 && (
                <div className="p-4 text-center text-zinc-500">결과 없음</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Settings Editor */}
      <div className="flex-1 overflow-y-auto">
        {selectedSchool ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                [{selectedSchool.대학명}] {selectedSchool.학과명}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">U_ID: {selectedSchool.U_ID} | {normGun(selectedSchool.군)}</p>
            </div>

            {/* 계산 유형 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="계산 유형" section="calcType" expanded={expandedSections.calcType} />
              {expandedSections.calcType && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">계산 방식</label>
                    <select
                      value={formulaType}
                      onChange={(e) => setFormulaType(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-700"
                    >
                      <option value="기본비율">기본 비율 계산</option>
                      <option value="특수공식">특수 공식 사용</option>
                    </select>
                  </div>

                  {formulaType === "특수공식" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">특수 공식 내용</label>
                      <textarea
                        value={specialFormula}
                        onChange={(e) => setSpecialFormula(e.target.value)}
                        className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-700 h-32"
                        placeholder="특수 계산식을 입력하세요..."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">전체 계산 방식</label>
                      <div className="flex gap-2">
                        {["환산", "직접"].map((m) => (
                          <button
                            key={m}
                            onClick={() => setCalcMethod(m)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                              calcMethod === m
                                ? "bg-blue-600 text-white"
                                : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200"
                            }`}
                          >
                            {m} 계산
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">총점 (만점)</label>
                      <div className="flex gap-2 flex-wrap">
                        {[1000, 500, 300].map((t) => (
                          <button
                            key={t}
                            onClick={() => { setTotalScore(t); setCustomTotal(""); }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              totalScore === t
                                ? "bg-blue-600 text-white"
                                : "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                        <input
                          type="number"
                          placeholder="직접입력"
                          value={customTotal}
                          onChange={(e) => { setCustomTotal(e.target.value); setTotalScore(-1); }}
                          className="w-24 px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 과목별 점수 종류 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="과목별 점수 종류" section="scoreConfig" expanded={expandedSections.scoreConfig} />
              {expandedSections.scoreConfig && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">국어/수학</label>
                      <select
                        value={kmType}
                        onChange={(e) => setKmType(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-700"
                      >
                        <option value="백분위">백분위</option>
                        <option value="표준점수">표준점수</option>
                        <option value="등급">등급</option>
                      </select>
                      {kmType === "표준점수" && (
                        <select
                          value={kmMaxMethod}
                          onChange={(e) => setKmMaxMethod(e.target.value)}
                          className="w-full p-2 border rounded-lg mt-2 bg-white dark:bg-zinc-700"
                        >
                          <option value="fixed_200">200점 만점 기준</option>
                          <option value="highest_of_year">당해 최고점 기준</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">영어</label>
                      <select
                        value={engType}
                        onChange={(e) => setEngType(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-700"
                      >
                        <option value="grade_conversion">등급별 환산점수</option>
                        <option value="fixed_max_score">고정 만점 기준</option>
                      </select>
                      {engType === "fixed_max_score" && (
                        <div className="flex gap-2 mt-2">
                          {[100, 200].map((s) => (
                            <button
                              key={s}
                              onClick={() => setEngMaxScore(s)}
                              className={`flex-1 py-2 rounded-lg text-sm ${
                                engMaxScore === s ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-700"
                              }`}
                            >
                              {s}점
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">탐구</label>
                      <select
                        value={inqType}
                        onChange={(e) => setInqType(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white dark:bg-zinc-700"
                      >
                        <option value="백분위">백분위</option>
                        <option value="표준점수">표준점수</option>
                        <option value="변환표준점수">변환표준점수</option>
                        <option value="등급">등급</option>
                      </select>
                      {["표준점수", "변환표준점수"].includes(inqType) && (
                        <select
                          value={inqMaxMethod}
                          onChange={(e) => setInqMaxMethod(e.target.value)}
                          className="w-full p-2 border rounded-lg mt-2 bg-white dark:bg-zinc-700"
                        >
                          <option value="fixed_100">100점 만점 기준</option>
                          <option value="highest_of_year">당해 최고점 기준</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 영어 등급별 배점 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="영어 등급별 배점" section="englishScores" expanded={expandedSections.englishScores} />
              {expandedSections.englishScores && (
                <div className="p-4">
                  <div className="grid grid-cols-9 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                      <div key={grade} className="text-center">
                        <label className="block text-xs font-medium mb-1">{grade}등급</label>
                        <input
                          type="number"
                          value={englishScores[grade] ?? ""}
                          onChange={(e) => setEnglishScores({ ...englishScores, [grade]: Number(e.target.value) })}
                          className="w-full p-2 border rounded-lg text-center text-sm bg-white dark:bg-zinc-700"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 한국사 등급별 배점 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="한국사 등급별 배점" section="historyScores" expanded={expandedSections.historyScores} />
              {expandedSections.historyScores && (
                <div className="p-4">
                  <div className="grid grid-cols-9 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((grade) => (
                      <div key={grade} className="text-center">
                        <label className="block text-xs font-medium mb-1">{grade}등급</label>
                        <input
                          type="number"
                          value={historyScores[grade] ?? ""}
                          onChange={(e) => setHistoryScores({ ...historyScores, [grade]: Number(e.target.value) })}
                          className="w-full p-2 border rounded-lg text-center text-sm bg-white dark:bg-zinc-700"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 선택 반영 규칙 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="선택 반영 규칙" section="selectionRules" expanded={expandedSections.selectionRules} />
              {expandedSections.selectionRules && (
                <div className="p-4 space-y-4">
                  {selectionRules.length === 0 ? (
                    <p className="text-sm text-zinc-500">현재 "기본 반영 비율"이 적용되어 있습니다.</p>
                  ) : (
                    selectionRules.map((rule, idx) => (
                      <div key={idx} className="p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <select
                            value={rule.type}
                            onChange={(e) => {
                              const updated = [...selectionRules];
                              updated[idx] = { ...rule, type: e.target.value as any };
                              setSelectionRules(updated);
                            }}
                            className="p-2 border rounded-lg bg-white dark:bg-zinc-700"
                          >
                            <option value="select_n">N개 선택</option>
                            <option value="select_ranked_weights">순위별 가중치</option>
                          </select>
                          <button
                            onClick={() => setSelectionRules(selectionRules.filter((_, i) => i !== idx))}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {["국어", "수학", "영어", "탐구", "한국사"].map((subj) => (
                            <label key={subj} className="inline-flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={rule.from?.includes(subj) || false}
                                onChange={(e) => {
                                  const updated = [...selectionRules];
                                  const currentFrom = rule.from || [];
                                  updated[idx] = {
                                    ...rule,
                                    from: e.target.checked
                                      ? [...currentFrom, subj]
                                      : currentFrom.filter((s) => s !== subj),
                                  };
                                  setSelectionRules(updated);
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{subj}</span>
                            </label>
                          ))}
                        </div>
                        {rule.type === "select_n" && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">위 과목 중</span>
                            <input
                              type="number"
                              value={rule.count || 1}
                              onChange={(e) => {
                                const updated = [...selectionRules];
                                updated[idx] = { ...rule, count: Number(e.target.value) };
                                setSelectionRules(updated);
                              }}
                              className="w-16 p-2 border rounded-lg text-center"
                              min={1}
                            />
                            <span className="text-sm">개 선택</span>
                          </div>
                        )}
                        {rule.type === "select_ranked_weights" && (
                          <div>
                            <label className="text-sm">순위별 가중치 (콤마 구분)</label>
                            <input
                              type="text"
                              value={rule.weights?.join(", ") || ""}
                              onChange={(e) => {
                                const updated = [...selectionRules];
                                updated[idx] = {
                                  ...rule,
                                  weights: e.target.value.split(",").map((w) => parseFloat(w.trim())).filter((n) => !isNaN(n)),
                                };
                                setSelectionRules(updated);
                              }}
                              className="w-full p-2 border rounded-lg mt-1"
                              placeholder="예: 0.35, 0.25, 0.2"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={addSelectionRule}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 text-sm"
                    >
                      <Plus className="w-4 h-4" /> 선택 규칙 추가
                    </button>
                    <button
                      onClick={() => setSelectionRules([])}
                      className="px-4 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 text-sm"
                    >
                      기본 반영으로 설정
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 가산점 규칙 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="가산점 규칙" section="bonusRules" expanded={expandedSections.bonusRules} />
              {expandedSections.bonusRules && (
                <div className="p-4 space-y-4">
                  {bonusRules.length === 0 ? (
                    <p className="text-sm text-zinc-500">설정된 가산점 규칙이 없습니다.</p>
                  ) : (
                    bonusRules.map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
                        <input
                          type="text"
                          value={rule.subjects?.join(", ") || ""}
                          onChange={(e) => {
                            const updated = [...bonusRules];
                            updated[idx] = { ...rule, subjects: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) };
                            setBonusRules(updated);
                          }}
                          className="flex-1 p-2 border rounded-lg"
                          placeholder="과목명 (콤마 구분)"
                        />
                        <input
                          type="number"
                          step="0.001"
                          value={rule.value || ""}
                          onChange={(e) => {
                            const updated = [...bonusRules];
                            updated[idx] = { ...rule, value: parseFloat(e.target.value) };
                            setBonusRules(updated);
                          }}
                          className="w-24 p-2 border rounded-lg"
                          placeholder="가산비율"
                        />
                        <button
                          onClick={() => setBonusRules(bonusRules.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    onClick={addBonusRule}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 text-sm"
                  >
                    <Plus className="w-4 h-4" /> 가산점 규칙 추가
                  </button>
                </div>
              )}
            </div>

            {/* 기타 설정 */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <SectionHeader title="기타 설정" section="otherSettings" expanded={expandedSections.otherSettings} />
              {expandedSections.otherSettings && (
                <div className="p-4 space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={historyFirst}
                      onChange={(e) => setHistoryFirst(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">한국사 가산점 우선 적용 (가산점을 먼저 더한 후 수능 비율 환산)</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-2">기타 메모 (영어 가산점 반영 등)</label>
                    <input
                      type="text"
                      value={etcNote}
                      onChange={(e) => setEtcNote(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      placeholder="예: 영어 가산점 반영"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="sticky bottom-0 bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              {message && (
                <span className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {message.text}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-auto inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                <Save className="w-5 h-5" />
                {saving ? "저장 중..." : "모든 규칙 저장"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            왼쪽 목록에서 학교를 선택하세요.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
