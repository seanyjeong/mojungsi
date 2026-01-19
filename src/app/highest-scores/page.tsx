"use client";

import { useState, useEffect } from "react";
import { Save, Target } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

// 기본 과목 목록 (API 응답이 비어있을 때 사용)
const DEFAULT_SUBJECTS = {
  주요: ["국어", "화법과작문", "언어와매체", "수학", "확률과통계", "미적분", "기하"],
  사탐: ["생윤", "윤사", "한지", "사문", "정법", "세지", "동아시아사", "세계사", "경제"],
  과탐: ["물리1", "물리2", "화학1", "화학2", "생명1", "생명2", "지학1", "지학2"],
};

interface HighestScore {
  id: number;
  과목명: string;
  최고점: number;
}

export default function HighestScoresPage() {
  const [year, setYear] = useState(2027);
  const [mohyung, setMohyung] = useState("수능");
  const [scores, setScores] = useState<HighestScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load scores
  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`${API_BASE}/admin/jungsi/highest-scores?year=${year}&mohyung=${encodeURIComponent(mohyung)}`);
        const data = await res.json();
        if (data.success) {
          if (data.scores && data.scores.length > 0) {
            setScores(data.scores);
          } else {
            // API 응답이 비어있으면 기본 과목 템플릿 생성
            const allSubjects = [
              ...DEFAULT_SUBJECTS.주요,
              ...DEFAULT_SUBJECTS.사탐,
              ...DEFAULT_SUBJECTS.과탐,
            ];
            setScores(allSubjects.map((name, idx) => ({
              id: -(idx + 1),  // 임시 음수 ID (새 데이터 표시)
              과목명: name,
              최고점: 0
            })));
          }
        } else {
          setMessage({ type: "error", text: "데이터 로드 실패" });
        }
      } catch (error) {
        console.error("Failed to fetch highest scores:", error);
        setMessage({ type: "error", text: "서버 연결 실패" });
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, [year, mohyung]);

  // Update local score
  const handleScoreChange = (id: number, value: number) => {
    setScores(prev => prev.map(s => s.id === id ? { ...s, 최고점: value } : s));
  };

  // Save all scores
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/highest-scores?year=${year}&mohyung=${encodeURIComponent(mohyung)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: scores.map(s => ({
            subject_name: s.과목명,
            max_score: s.최고점
          }))
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: `${data.count}개 과목 저장 완료` });
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

  // Group scores by category
  const 주요과목 = ["국어", "화법과작문", "언어와매체", "수학", "확률과통계", "미적분", "기하"];
  const 사탐과목 = ["생윤", "윤사", "한지", "사문", "정법", "세지", "동아시아사", "세계사", "경제"];
  const 과탐과목 = ["물리1", "물리2", "화학1", "화학2", "생명1", "생명2", "지학1", "지학2"];
  const 모든과목 = [...주요과목, ...사탐과목, ...과탐과목];

  const groupedScores = {
    주요: scores.filter(s => 주요과목.includes(s.과목명)),
    사탐: scores.filter(s => 사탐과목.includes(s.과목명)),
    과탐: scores.filter(s => 과탐과목.includes(s.과목명)),
    기타: scores.filter(s => !모든과목.includes(s.과목명)),
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Target className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">최고표점 관리</h1>
            <p className="text-sm text-zinc-500">과목별 최고 표준점수를 설정합니다</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
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
            <label className="block text-sm font-medium mb-1">모형</label>
            <select
              value={mohyung}
              onChange={(e) => setMohyung(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white dark:bg-zinc-700"
            >
              <option value="수능">수능</option>
              <option value="9월모평">9월모평</option>
              <option value="6월모평">6월모평</option>
              <option value="3월모의고사">3월모의고사</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-zinc-500">로딩 중...</div>
      )}

      {/* Scores Table */}
      {!loading && (
        <div className="space-y-6">
          {/* 주요 과목 */}
          {groupedScores.주요.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">주요 과목</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {groupedScores.주요.map((s) => (
                  <div key={s.id} className="text-center">
                    <label className="block text-sm font-medium mb-2">{s.과목명}</label>
                    <input
                      type="number"
                      value={s.최고점}
                      onChange={(e) => handleScoreChange(s.id, Number(e.target.value))}
                      className="w-full p-3 border rounded-lg text-center text-lg font-semibold bg-white dark:bg-zinc-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 사회탐구 */}
          {groupedScores.사탐.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">사회탐구</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {groupedScores.사탐.map((s) => (
                  <div key={s.id} className="text-center">
                    <label className="block text-xs font-medium mb-1">{s.과목명}</label>
                    <input
                      type="number"
                      value={s.최고점}
                      onChange={(e) => handleScoreChange(s.id, Number(e.target.value))}
                      className="w-full p-2 border rounded-lg text-center bg-white dark:bg-zinc-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 과학탐구 */}
          {groupedScores.과탐.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">과학탐구</h3>
              <div className="grid grid-cols-4 md:grid-cols-4 gap-4">
                {groupedScores.과탐.map((s) => (
                  <div key={s.id} className="text-center">
                    <label className="block text-xs font-medium mb-1">{s.과목명}</label>
                    <input
                      type="number"
                      value={s.최고점}
                      onChange={(e) => handleScoreChange(s.id, Number(e.target.value))}
                      className="w-full p-2 border rounded-lg text-center bg-white dark:bg-zinc-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 기타 */}
          {groupedScores.기타.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold mb-4">기타</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {groupedScores.기타.map((s) => (
                  <div key={s.id} className="text-center">
                    <label className="block text-xs font-medium mb-1">{s.과목명}</label>
                    <input
                      type="number"
                      value={s.최고점}
                      onChange={(e) => handleScoreChange(s.id, Number(e.target.value))}
                      className="w-full p-2 border rounded-lg text-center bg-white dark:bg-zinc-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="sticky bottom-4 bg-white dark:bg-zinc-800 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            {message && (
              <span className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {message.text}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || scores.length === 0}
              className="ml-auto inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              <Save className="w-5 h-5" />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
