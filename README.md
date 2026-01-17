# 정시 관리 시스템 - Admin Frontend

체대입시 정시 환산점수 계산 시스템의 관리자 페이지

**Version:** v0.2.2

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

## 기능

- [x] 로그인/로그아웃
- [x] 메인 대시보드
- [x] 계산 설정 (`/setting`)
- [x] 기본정보 수정 (`/setting/basic`)
- [x] 비율 설정 (`/setting/ratios`)
- [x] 엑셀 일괄 수정 (`/setting/bulk`)
- [x] 연도 복사 (`/copy-year`)
- [x] 통계 (`/stats`)
- [x] 버전 표시

## 프로젝트 구조

```
admin/
├── src/
│   ├── app/
│   │   ├── login/          # 로그인
│   │   ├── setting/        # 계산 설정
│   │   ├── copy-year/      # 연도 복사
│   │   └── stats/          # 통계
│   ├── components/
│   │   ├── ui/             # shadcn 컴포넌트
│   │   └── sidebar.tsx     # 사이드바
│   └── lib/
│       └── api.ts          # API 클라이언트
└── package.json
```

## 실행

### 개발
```bash
npm run dev
```

### 빌드
```bash
npm run build
```

## 환경변수

`.env.local`:
```
NEXT_PUBLIC_API_URL=https://jungsi.sean8320.dedyn.io
```

## 배포

GitHub push → Vercel 자동 배포

## 로그인 정보

- ID: `admin`
- PW: `admin1234`
