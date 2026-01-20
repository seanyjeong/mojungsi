"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Calendar, AlertTriangle, Clock, CheckCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

// 시험 타입
const EXAM_TYPES = ["3월", "6월", "9월", "수능"] as const;
type ExamType = (typeof EXAM_TYPES)[number];

interface ExamSchedule {
  exam_type: ExamType;
  exam_date: string;
  release_date: string;
}

export default function ExamSchedulePage() {
  const [year, setYear] = useState(2027);
  const [schedules, setSchedules] = useState<Record<ExamType, ExamSchedule>>({
    "3월": { exam_type: "3월", exam_date: "", release_date: "" },
    "6월": { exam_type: "6월", exam_date: "", release_date: "" },
    "9월": { exam_type: "9월", exam_date: "", release_date: "" },
    "수능": { exam_type: "수능", exam_date: "", release_date: "" },
  });
  const [forceExam, setForceExam] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 데이터 로드
  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`${API_BASE}/admin/exam-schedule?year=${year}`);
        const data = await res.json();
        if (data.success) {
          // 기존 데이터로 상태 업데이트
          const newSchedules = { ...schedules };
          for (const s of data.schedules) {
            if (EXAM_TYPES.includes(s.exam_type)) {
              newSchedules[s.exam_type as ExamType] = s;
            }
          }
          setSchedules(newSchedules);
          setForceExam(data.forceExam);
        }
      } catch (error) {
        console.error("Failed to fetch schedules:", error);
        setMessage({ type: "error", text: "서버 연결 실패" });
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [year]);

  // 일정 수정
  const handleDateChange = (
    examType: ExamType,
    field: "exam_date" | "release_date",
    value: string
  ) => {
    setSchedules((prev) => ({
      ...prev,
      [examType]: {
        ...prev[examType],
        [field]: value,
      },
    }));
  };

  // 단일 시험 저장
  const handleSaveSchedule = async (examType: ExamType) => {
    const schedule = schedules[examType];
    if (!schedule.exam_date || !schedule.release_date) {
      setMessage({ type: "error", text: "시험일과 발표일을 모두 입력하세요" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/exam-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          exam_type: examType,
          exam_date: schedule.exam_date,
          release_date: schedule.release_date,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
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

  // 강제 설정 저장
  const handleSaveForceExam = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/exam-schedule/force`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          force_exam: forceExam === "자동" ? null : forceExam,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
      } else {
        setMessage({ type: "error", text: "저장 실패" });
      }
    } catch (error) {
      console.error("Failed to save force exam:", error);
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSaving(false);
    }
  };

  // 현재 활성 시험 계산
  const getActiveExam = (): { exam: ExamType | null; mode: "가채점" | "성적표" | null } => {
    if (forceExam && forceExam !== "자동") {
      return { exam: forceExam as ExamType, mode: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const examType of EXAM_TYPES) {
      const schedule = schedules[examType];
      if (!schedule.exam_date || !schedule.release_date) continue;

      const examDate = new Date(schedule.exam_date);
      const releaseDate = new Date(schedule.release_date);
      examDate.setHours(0, 0, 0, 0);
      releaseDate.setHours(0, 0, 0, 0);

      if (today >= examDate && today < releaseDate) {
        return { exam: examType, mode: "가채점" };
      }
    }

    // 가장 최근 발표된 시험 찾기
    for (let i = EXAM_TYPES.length - 1; i >= 0; i--) {
      const examType = EXAM_TYPES[i];
      const schedule = schedules[examType];
      if (!schedule.release_date) continue;

      const releaseDate = new Date(schedule.release_date);
      releaseDate.setHours(0, 0, 0, 0);

      if (today >= releaseDate) {
        return { exam: examType, mode: "성적표" };
      }
    }

    return { exam: null, mode: null };
  };

  const activeExamInfo = getActiveExam();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">시험 일정 관리</h1>
          <p className="text-sm text-zinc-500">가채점/성적표 모드 전환을 위한 시험 일정을 설정합니다</p>
        </div>
      </div>

      {/* Year Selector + Active Exam Info */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

          {/* 현재 활성 시험 표시 */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">현재 활성 시험</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {activeExamInfo.exam ? (
                  <>
                    {activeExamInfo.exam}
                    {activeExamInfo.mode && (
                      <span className="ml-2 text-sm font-normal text-blue-600">
                        ({activeExamInfo.mode} 모드)
                      </span>
                    )}
                    {forceExam && forceExam !== "자동" && (
                      <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                        강제 설정됨
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-zinc-500">없음</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-zinc-500">로딩 중...</div>
      )}

      {/* Schedules Table */}
      {!loading && (
        <div className="space-y-4">
          {EXAM_TYPES.map((examType) => {
            const schedule = schedules[examType];
            const isActive = activeExamInfo.exam === examType;

            return (
              <div
                key={examType}
                className={`bg-white dark:bg-zinc-800 rounded-xl p-6 border ${
                  isActive
                    ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isActive
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-zinc-100 dark:bg-zinc-700"
                      }`}
                    >
                      <Calendar
                        className={`w-5 h-5 ${
                          isActive ? "text-blue-600" : "text-zinc-500"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{examType}</h3>
                      {isActive && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          현재 활성
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSaveSchedule(examType)}
                    disabled={saving || !schedule.exam_date || !schedule.release_date}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-600 dark:text-zinc-400">
                      시험일
                    </label>
                    <input
                      type="date"
                      value={schedule.exam_date}
                      onChange={(e) =>
                        handleDateChange(examType, "exam_date", e.target.value)
                      }
                      className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-600 dark:text-zinc-400">
                      발표일
                    </label>
                    <input
                      type="date"
                      value={schedule.release_date}
                      onChange={(e) =>
                        handleDateChange(examType, "release_date", e.target.value)
                      }
                      className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
                    />
                  </div>
                </div>

                {/* 기간 표시 */}
                {schedule.exam_date && schedule.release_date && (
                  <div className="mt-3 text-sm text-zinc-500 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-amber-500" />
                      가채점 기간: {schedule.exam_date} ~ {schedule.release_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      성적표 기간: {schedule.release_date} ~
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Force Exam Setting */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                  활성 시험 강제 설정
                </h3>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  디버깅용 - 날짜 기반 자동 판단을 무시하고 특정 시험을 강제로 활성화합니다
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={forceExam || "자동"}
                onChange={(e) =>
                  setForceExam(e.target.value === "자동" ? null : e.target.value)
                }
                className="px-4 py-2 border border-amber-300 rounded-lg bg-white dark:bg-zinc-700"
              >
                <option value="자동">자동 (날짜 기반)</option>
                {EXAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <button
                onClick={handleSaveForceExam}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition text-sm"
              >
                <Save className="w-4 h-4" />
                강제 설정 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
