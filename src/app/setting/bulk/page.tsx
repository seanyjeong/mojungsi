"use client";

import { useState, useRef } from "react";
import { Download, Upload, ArrowLeft, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

interface ExportRow {
  U_ID: number;
  대학명: string;
  학과명: string;
  군: string;
  형태: string;
  모집정원: string;
  수능비율: string;
  내신비율: string;
  실기비율: string;
  총점: number;
  국어: number;
  수학: number;
  영어: number;
  탐구: number;
  탐구수: number;
  영1: number | string;
  영2: number | string;
  영3: number | string;
  영4: number | string;
  영5: number | string;
  영6: number | string;
  영7: number | string;
  영8: number | string;
  영9: number | string;
  한1: number | string;
  한2: number | string;
  한3: number | string;
  한4: number | string;
  한5: number | string;
  한6: number | string;
  한7: number | string;
  한8: number | string;
  한9: number | string;
}

export default function BulkPage() {
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [uploadResult, setUploadResult] = useState<{ updated: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Excel
  const handleDownload = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/admin/jungsi/export?year=${year}`);
      const json = await res.json();

      if (!json.success) {
        setMessage({ type: "error", text: "데이터 로드에 실패했습니다." });
        return;
      }

      const data: ExportRow[] = json.data;

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      ws["!cols"] = [
        { wch: 8 },   // U_ID
        { wch: 20 },  // 대학명
        { wch: 30 },  // 학과명
        { wch: 5 },   // 군
        { wch: 8 },   // 형태
        { wch: 8 },   // 모집정원
        { wch: 8 },   // 수능비율
        { wch: 8 },   // 내신비율
        { wch: 8 },   // 실기비율
        { wch: 8 },   // 총점
        { wch: 6 },   // 국어
        { wch: 6 },   // 수학
        { wch: 6 },   // 영어
        { wch: 6 },   // 탐구
        { wch: 6 },   // 탐구수
        { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, // 영1-9
        { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, // 한1-9
      ];

      XLSX.utils.book_append_sheet(wb, ws, "정시데이터");

      // Download
      XLSX.writeFile(wb, `정시데이터_${year}.xlsx`);
      setMessage({ type: "success", text: `${data.length}개 학과 데이터를 다운로드했습니다.` });
    } catch (error) {
      console.error("Download error:", error);
      setMessage({ type: "error", text: "다운로드 중 오류가 발생했습니다." });
    } finally {
      setLoading(false);
    }
  };

  // Handle file select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    setUploadResult(null);

    try {
      // Read file
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        setMessage({ type: "error", text: "엑셀 파일에 데이터가 없습니다." });
        return;
      }

      // Transform to API format
      const apiData = rows.map((row) => {
        const item: any = {
          U_ID: Number(row.U_ID),
        };

        // Basic info
        if (row.대학명 !== undefined) item.univ_name = String(row.대학명);
        if (row.학과명 !== undefined) item.dept_name = String(row.학과명);
        if (row.군 !== undefined) item.gun = String(row.군);
        if (row.모집정원 !== undefined) item.quota = String(row.모집정원);

        // Ratios
        if (row.수능비율 !== undefined) item.suneung = String(row.수능비율);
        if (row.내신비율 !== undefined) item.naesin = String(row.내신비율);
        if (row.실기비율 !== undefined) item.practical = String(row.실기비율);

        // Subject ratios
        if (row.국어 !== undefined && row.국어 !== "") item.korean = Number(row.국어);
        if (row.수학 !== undefined && row.수학 !== "") item.math = Number(row.수학);
        if (row.영어 !== undefined && row.영어 !== "") item.english = Number(row.영어);
        if (row.탐구 !== undefined && row.탐구 !== "") item.inquiry = Number(row.탐구);
        if (row.탐구수 !== undefined && row.탐구수 !== "") item.inquiry_count = Number(row.탐구수);

        // English scores (only if any are set)
        const engScores: Record<string, number> = {};
        let hasEngScores = false;
        for (let i = 1; i <= 9; i++) {
          const val = row[`영${i}`];
          if (val !== undefined && val !== "") {
            engScores[String(i)] = Number(val);
            hasEngScores = true;
          }
        }
        if (hasEngScores) item.english_scores = engScores;

        // History scores (only if any are set)
        const histScores: Record<string, number> = {};
        let hasHistScores = false;
        for (let i = 1; i <= 9; i++) {
          const val = row[`한${i}`];
          if (val !== undefined && val !== "") {
            histScores[String(i)] = Number(val);
            hasHistScores = true;
          }
        }
        if (hasHistScores) item.history_scores = histScores;

        return item;
      }).filter((item) => item.U_ID && !isNaN(item.U_ID));

      if (apiData.length === 0) {
        setMessage({ type: "error", text: "유효한 U_ID가 있는 데이터가 없습니다." });
        return;
      }

      setMessage({ type: "info", text: `${apiData.length}개 학과 데이터를 업로드 중...` });

      // Upload to API
      const res = await fetch(`${API_BASE}/admin/jungsi/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, data: apiData }),
      });

      const result = await res.json();

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setUploadResult({ updated: result.updated, failed: result.failed, errors: result.errors || [] });
      } else {
        setMessage({ type: "error", text: "업로드에 실패했습니다." });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ type: "error", text: "파일 처리 중 오류가 발생했습니다." });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/setting"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">엑셀 일괄 업로드/다운로드</h1>
          <p className="text-sm text-zinc-500 mt-1">
            엑셀 파일로 여러 학과의 정보를 한번에 수정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Year selector */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-6">
        <label className="block text-sm font-medium mb-2">학년도 선택</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-48 p-3 border rounded-lg bg-white dark:bg-zinc-700"
        >
          <option value={2026}>2026학년도</option>
          <option value={2027}>2027학년도</option>
        </select>
      </div>

      {/* Download section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Download className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">엑셀 다운로드</h2>
            <p className="text-sm text-zinc-500 mb-4">
              현재 저장된 모든 학과 데이터를 엑셀 파일로 다운로드합니다.
              <br />
              다운로드한 파일을 수정한 후 다시 업로드하면 일괄 수정됩니다.
            </p>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-5 h-5" />
              {loading ? "다운로드 중..." : "엑셀 다운로드"}
            </button>
          </div>
        </div>
      </div>

      {/* Upload section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Upload className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">엑셀 업로드</h2>
            <p className="text-sm text-zinc-500 mb-4">
              수정한 엑셀 파일을 업로드하여 데이터를 일괄 수정합니다.
              <br />
              <strong>U_ID</strong> 컬럼은 필수입니다. 수정하지 않을 컬럼은 비워두세요.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                uploading
                  ? "bg-zinc-300 text-zinc-500"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              {uploading ? "업로드 중..." : "엑셀 파일 선택"}
            </label>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl p-4 border mb-6 flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : message.type === "error"
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : message.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <span
            className={`text-sm ${
              message.type === "success"
                ? "text-green-700 dark:text-green-400"
                : message.type === "error"
                ? "text-red-700 dark:text-red-400"
                : "text-blue-700 dark:text-blue-400"
            }`}
          >
            {message.text}
          </span>
        </div>
      )}

      {/* Upload result */}
      {uploadResult && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
          <h3 className="font-semibold mb-4">업로드 결과</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{uploadResult.updated}</div>
              <div className="text-sm text-zinc-500">성공</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{uploadResult.failed}</div>
              <div className="text-sm text-zinc-500">실패</div>
            </div>
          </div>
          {uploadResult.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-red-600">오류 목록:</h4>
              <ul className="text-sm text-zinc-500 space-y-1">
                {uploadResult.errors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-zinc-50 dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
        <h3 className="font-semibold mb-4">사용 방법</h3>
        <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
          <li>먼저 <strong>엑셀 다운로드</strong> 버튼을 클릭하여 현재 데이터를 다운로드합니다.</li>
          <li>다운로드한 엑셀 파일을 열고 수정이 필요한 셀을 수정합니다.</li>
          <li><strong>U_ID 컬럼은 절대 수정하지 마세요!</strong> (학과 식별에 사용됩니다)</li>
          <li>수정하지 않을 컬럼은 그대로 두거나 값을 비워두세요.</li>
          <li>수정이 완료되면 <strong>엑셀 파일 선택</strong> 버튼을 클릭하여 업로드합니다.</li>
        </ol>

        <h4 className="font-medium mt-6 mb-2">컬럼 설명</h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            <strong>기본 정보:</strong>
            <ul className="mt-1 space-y-0.5">
              <li>• U_ID: 학과 고유번호 (필수, 수정불가)</li>
              <li>• 대학명, 학과명: 대학/학과 이름</li>
              <li>• 군: 가/나/다군</li>
              <li>• 모집정원: 모집 인원</li>
            </ul>
          </div>
          <div>
            <strong>비율 정보:</strong>
            <ul className="mt-1 space-y-0.5">
              <li>• 수능/내신/실기비율: 전형 비율 (%)</li>
              <li>• 국어/수학/영어/탐구: 과목별 비율 (%)</li>
              <li>• 영1~영9: 영어 등급별 배점</li>
              <li>• 한1~한9: 한국사 등급별 배점</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
