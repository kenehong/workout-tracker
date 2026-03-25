# Workout Tracker

> 계정, 서버, 클라우드 없이 로컬에서만 동작하는 미니멀 웨이트 트레이닝 로거

## Core UX Flow

1. 진입: 앱 첫 실행 시 Setup → 워크아웃 루틴(로테이션) 구성
2. 핵심 액션: 홈(캘린더)에서 "Start — {운동명}" 버튼 탭 → Workout 페이지에서 세트/렙/무게 기록 → 완료
3. 결과: 홈 캘린더에 운동한 날 하이라이트, 월별 횟수 + 주간 평균 확인

## Philosophy

- 기록만 한다 — 분석, SNS, 광고, 계정 없음
- 오프라인 우선 — IndexedDB 로컬 저장, 데이터 외부 전송 없음
- 인터페이스 최소화 — 필요한 것만, 불필요한 기능 추가 금지
- PWA 설치 가능 — 모바일/데스크톱 네이티브 앱처럼 동작

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Tailwind CSS v4, shadcn/ui (Radix UI), Lucide Icons |
| Routing | Hash-based (`#/`, `#/setup`, `#/workout/:id`) |
| Data | Dexie (IndexedDB wrapper) — `WorkoutTrackerDB` (exercises, sessions, sets, settings) |
| Build | Vite 6, vite-plugin-pwa |
| Deploy | Static hosting (PWA, offline-capable) |

## Critical Rules

- 데이터는 IndexedDB에만 저장 — 서버/클라우드 연동 절대 금지
- 신규 사용자는 Setup 완료 전까지 홈 진입 불가 (rotation 없으면 Setup으로 강제 이동)
- 세션 시작은 `createSession(date, workoutTypeIdx)` → Workout 페이지로 이동
- 운동 로테이션은 사용자가 직접 구성 (프리셋 + 커스텀 이름 모두 허용)
- Wake Lock API로 운동 중 화면 꺼짐 방지 (지원 환경에서)
- DB 스키마 변경은 Dexie version() 마이그레이션으로만 처리
- 파일당 ~500 LOC 유지 — 컴포넌트가 커지면 분리

## Persona

- **Target user**: 헬스장에서 스마트폰으로 세트를 기록하는 개인 트레이너 없는 일반인
- **Tone**: 군더더기 없이 빠름 — 운동 중에 앱과 씨름하지 않도록
- **Language**: UI는 영어, 내부 주석/문서는 한국어 혼용 가능
