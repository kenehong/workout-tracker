import db from './database.js';

const DEFAULT_EXERCISES = [
  // chest
  { name: '벤치프레스', category: 'chest' },
  { name: '인클라인 벤치프레스', category: 'chest' },
  { name: '디클라인 벤치프레스', category: 'chest' },
  { name: '덤벨 플라이', category: 'chest' },
  { name: '케이블 크로스오버', category: 'chest' },

  // back
  { name: '데드리프트', category: 'back' },
  { name: '바벨로우', category: 'back' },
  { name: '풀업', category: 'back' },
  { name: '랫풀다운', category: 'back' },
  { name: '시티드 로우', category: 'back' },
  { name: '원암 덤벨로우', category: 'back' },

  // shoulders
  { name: '오버헤드프레스', category: 'shoulders' },
  { name: '덤벨 숄더프레스', category: 'shoulders' },
  { name: '레터럴레이즈', category: 'shoulders' },
  { name: '프론트레이즈', category: 'shoulders' },
  { name: '페이스풀', category: 'shoulders' },

  // legs
  { name: '스쿼트', category: 'legs' },
  { name: '프론트 스쿼트', category: 'legs' },
  { name: '레그프레스', category: 'legs' },
  { name: '런지', category: 'legs' },
  { name: '레그컬', category: 'legs' },
  { name: '레그익스텐션', category: 'legs' },
  { name: '카프레이즈', category: 'legs' },

  // arms
  { name: '바이셉 컬', category: 'arms' },
  { name: '해머 컬', category: 'arms' },
  { name: '트라이셉 익스텐션', category: 'arms' },
  { name: '트라이셉 푸시다운', category: 'arms' },
  { name: '딥스', category: 'arms' },

  // core
  { name: '플랭크', category: 'core' },
  { name: '크런치', category: 'core' },
  { name: '레그레이즈', category: 'core' },
  { name: '러시안 트위스트', category: 'core' },
];

export async function seedExercises() {
  const count = await db.exercises.count();
  if (count > 0) return;

  const exercises = DEFAULT_EXERCISES.map((ex) => ({
    id: crypto.randomUUID(),
    ...ex,
  }));

  await db.exercises.bulkAdd(exercises);
}
