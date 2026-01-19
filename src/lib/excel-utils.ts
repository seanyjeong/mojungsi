import ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  width: number;
}

/**
 * 데이터를 엑셀 파일로 다운로드
 */
export async function downloadExcel<T extends object>(
  data: T[],
  columns: ExcelColumn[],
  filename: string,
  sheetName: string = "Sheet1"
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // 컬럼 설정
  worksheet.columns = columns;

  // 데이터 추가
  worksheet.addRows(data);

  // 브라우저 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 엑셀 파일을 파싱하여 JSON 배열로 변환
 */
export async function parseExcelFile<T = Record<string, unknown>>(
  file: File
): Promise<T[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  return worksheetToJson<T>(worksheet);
}

/**
 * ExcelJS 워크시트를 JSON 배열로 변환
 */
function worksheetToJson<T = Record<string, unknown>>(
  worksheet: ExcelJS.Worksheet
): T[] {
  const rows: T[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // 첫 번째 행은 헤더
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? "");
      });
    } else {
      // 나머지 행은 데이터
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      rows.push(rowData as T);
    }
  });

  return rows;
}
