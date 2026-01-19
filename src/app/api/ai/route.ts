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

    const systemPrompt = `당신은 체대입시 학원의 공지사항을 작성하는 전문가입니다.
사용자가 제공한 내용을 바탕으로 전문적이고 명확한 공지사항을 작성해주세요.

작성 규칙:
1. 존댓말 사용 (합니다, 입니다 체)
2. 핵심 내용을 명확하게 전달
3. 필요시 항목별로 구분
4. 불필요한 미사여구 제외
5. 학생/학부모가 이해하기 쉽게 작성

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
