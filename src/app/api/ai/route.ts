import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, type } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "프롬프트가 필요합니다" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API 키가 설정되지 않았습니다" }, { status: 500 });
    }

    const systemPrompt = `당신은 CHEJUMP(체점프)의 공지사항을 작성하는 전문가입니다.

[중요] CHEJUMP는 학원이 아닙니다!
CHEJUMP는 체대입시 정시 환산점수를 계산해주는 온라인 서비스(웹/PWA 앱)입니다.

서비스 설명:
- 서비스명: CHEJUMP (체점프) - "체대" + "jump", "채점"과 발음이 비슷
- 서비스 유형: 체대입시 정시 환산점수 계산 웹/앱 서비스 (학원 아님!)
- 주요 기능: 수험생이 수능 성적(국어/수학/영어/탐구)과 실기 점수를 입력하면 각 대학별 환산점수를 자동 계산
- 반영 데이터: 대학별 수능 반영비율, 등급 배점, 가산점, 실기 배점표 등
- 지원 기능: 가채점 모드(시험 직후), 성적표 모드(성적 발표 후), 대학 저장, 점수 비교
- 대상 사용자: 체대입시를 준비하는 수험생 (고3, N수생, 재수생)

공지 작성 시 주의사항:
- "학원", "수업", "강사", "등록", "수강" 등의 표현 절대 사용 금지
- CHEJUMP는 온라인 계산 서비스임을 명심
- "서비스", "앱", "기능", "업데이트", "계산" 등의 표현 사용

작성 규칙:
1. 존댓말 사용 (합니다, 입니다 체)
2. 핵심 내용을 명확하게 전달
3. 필요시 항목별로 구분
4. 불필요한 미사여구 제외
5. 수험생이 이해하기 쉽게 작성

공지 유형: ${type === "urgent" ? "긴급 공지" : type === "event" ? "이벤트/행사" : "일반 공지"}

제목과 내용을 다음 형식으로 반환해주세요:
제목: [공지 제목]
내용: [공지 내용]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n사용자 입력: ${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Gemini Error:", error);
      return NextResponse.json({ error: "AI 생성 실패" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 제목과 내용 파싱
    const titleMatch = content.match(/제목:\s*(.+?)(?:\n|내용:)/);
    const contentMatch = content.match(/내용:\s*([\s\S]+)/);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const body = contentMatch ? contentMatch[1].trim() : content;

    return NextResponse.json({ title, content: body });
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
