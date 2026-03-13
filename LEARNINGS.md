# Learnings - Workout Tracker

- Dexie v4 사용 중. IndexedDB 인덱스는 stores()에서 comma-separated로 선언.
- vite-plugin-pwa v1.2.0 — registerType: 'autoUpdate'로 SW 자동 갱신.
- base: '/workout-tracker/' 설정됨 — 배포 시 서브패스 주의.
- 세션 date 필드는 'YYYY-MM-DD' 문자열, startedAt/finishedAt은 epoch ms.
- exercises 시드는 seedExercises()로 앱 초기화 시 1회 실행 필요.
- React 19 + Tailwind CSS v4 + shadcn/ui (New York style) 사용 중. Preact에서 마이그레이션 완료.
- vite v6 사용 — vite-plugin-pwa 1.2.0이 vite 8 peer dep 미지원이라 다운그레이드.
- shadcn/ui는 JSX (TSX 아님). 컴포넌트는 src/components/ui/에 수동 생성.
- 다크모드: .dark 클래스 + prefers-color-scheme 감지 (main.jsx). oklch 컬러 토큰.
- @/ path alias 설정됨 (vite.config.js resolve.alias).
