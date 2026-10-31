import type { Dino } from './types';

/** 레벨별 시작 XP (데이터베이스 level_for_xp 와 같은 값) */
export const LEVEL_MIN_XP = [0, 0, 100, 500, 1200] as const;

export const LEVEL_NAME: Record<number, string> = {
  1: '알',
  2: '아기 공룡',
  3: '어린이 공룡',
  4: '성체 공룡',
};

export type DinoProgress = {
  /** 게이지 채움 정도 0~1 */
  ratio: number;
  /** 게이지 아래 문구 */
  label: string;
};

export function dinoProgress(dino: Dino, maxLevel: number): DinoProgress {
  const { xp, level } = dino;
  if (level >= 4) {
    return { ratio: 1, label: `${xp} XP · 다 자랐어요!` };
  }
  const next = LEVEL_MIN_XP[level + 1];
  if (level >= maxLevel && xp >= next) {
    return { ratio: 1, label: `${xp} XP · 다음 진화는 곧 업데이트로 열려요!` };
  }
  const start = LEVEL_MIN_XP[level];
  const ratio = Math.max(0, Math.min(1, (xp - start) / (next - start)));
  const action = level === 1 ? '부화까지' : '진화까지';
  return { ratio, label: `${xp} / ${next} XP · ${action} ${Math.max(0, next - xp)} XP` };
}
