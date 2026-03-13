# Learnings - Workout Tracker

- Dexie v4 사용 중. IndexedDB 인덱스는 stores()에서 comma-separated로 선언.
- vite-plugin-pwa v1.2.0 — registerType: 'autoUpdate'로 SW 자동 갱신.
- base: '/workout-tracker/' 설정됨 — 배포 시 서브패스 주의.
- 세션 date 필드는 'YYYY-MM-DD' 문자열, startedAt/finishedAt은 epoch ms.
- exercises 시드는 seedExercises()로 앱 초기화 시 1회 실행 필요.
