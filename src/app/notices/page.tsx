"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Edit2, Eye, EyeOff, Bell, AlertTriangle, Calendar, Sparkles, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

interface Notice {
  id: number;
  title: string;
  content: string;
  type: "general" | "urgent" | "event";
  is_active: boolean;
  published_at: string | null;
  created_at: string;
  _count?: { reads: number };
}

const typeLabels = {
  general: { label: "일반", color: "bg-gray-100 text-gray-700" },
  urgent: { label: "긴급", color: "bg-red-100 text-red-700" },
  event: { label: "이벤트", color: "bg-purple-100 text-purple-700" },
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "general" as "general" | "urgent" | "event",
    is_active: true,
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // 목록 조회
  const fetchNotices = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/notices`);
      const data = await res.json();
      setNotices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // 저장 (생성/수정)
  const handleSave = async () => {
    try {
      const url = editingNotice
        ? `${API_BASE}/admin/notices/${editingNotice.id}`
        : `${API_BASE}/admin/notices`;
      const method = editingNotice ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setShowModal(false);
      setEditingNotice(null);
      setForm({ title: "", content: "", type: "general", is_active: true });
      fetchNotices();
    } catch (error) {
      console.error(error);
    }
  };

  // 삭제
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await fetch(`${API_BASE}/admin/notices/${id}`, { method: "DELETE" });
      fetchNotices();
    } catch (error) {
      console.error(error);
    }
  };

  // 활성화 토글
  const handleToggle = async (id: number) => {
    try {
      await fetch(`${API_BASE}/admin/notices/${id}/toggle`, { method: "PATCH" });
      fetchNotices();
    } catch (error) {
      console.error(error);
    }
  };

  // 수정 모달 열기
  const openEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setForm({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      is_active: notice.is_active,
    });
    setShowModal(true);
  };

  // 새 공지 모달 열기
  const openNew = () => {
    setEditingNotice(null);
    setForm({ title: "", content: "", type: "general", is_active: true });
    setAiPrompt("");
    setShowModal(true);
  };

  // AI로 공지 생성
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, type: form.type }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setForm({
        ...form,
        title: data.title || form.title,
        content: data.content || form.content,
      });
      setAiPrompt("");
    } catch (error) {
      console.error(error);
      alert("AI 생성 실패");
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">공지사항 관리</h1>
            <p className="text-sm text-zinc-500">학생용 앱에 표시될 공지사항을 관리합니다</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          새 공지
        </button>
      </div>

      {/* 공지 목록 */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">로딩 중...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>등록된 공지사항이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`p-5 bg-white dark:bg-zinc-800 rounded-xl border ${
                notice.is_active
                  ? "border-zinc-200 dark:border-zinc-700"
                  : "border-zinc-100 dark:border-zinc-800 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        typeLabels[notice.type].color
                      }`}
                    >
                      {typeLabels[notice.type].label}
                    </span>
                    {!notice.is_active && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-zinc-100 text-zinc-500">
                        비공개
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">
                      읽음 {notice._count?.reads || 0}명
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                    {notice.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {notice.content}
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    {new Date(notice.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(notice.id)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition"
                    title={notice.is_active ? "비공개로 변경" : "공개로 변경"}
                  >
                    {notice.is_active ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(notice)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingNotice ? "공지 수정" : "새 공지 작성"}
            </h2>

            <div className="space-y-4">
              {/* AI 작성 도우미 */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI 작성 도우미</span>
                </div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-zinc-800 resize-none mb-2"
                  placeholder="예: 다음주 월요일부터 겨울방학 특강 시작, 시간은 오전 9시부터"
                />
                <button
                  onClick={generateWithAI}
                  disabled={!aiPrompt.trim() || aiGenerating}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI로 작성하기
                    </>
                  )}
                </button>
              </div>

              {/* 종류 */}
              <div>
                <label className="block text-sm font-medium mb-1">종류</label>
                <div className="flex gap-2">
                  {(["general", "urgent", "event"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, type })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        form.type === type
                          ? typeLabels[type].color + " ring-2 ring-offset-2 ring-blue-500"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {typeLabels[type].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
                  placeholder="공지 제목을 입력하세요"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-medium mb-1">내용</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 resize-none"
                  placeholder="공지 내용을 입력하세요"
                />
              </div>

              {/* 공개 여부 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm">
                  공개
                </label>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title || !form.content}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
