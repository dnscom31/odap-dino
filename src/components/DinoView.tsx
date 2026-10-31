import Svg, { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';

import type { EggColor } from '@/lib/types';

const PALETTE: Record<EggColor, { body: string; dark: string; belly: string }> = {
  green: { body: '#7BC96F', dark: '#4E9A45', belly: '#D9F2C9' },
  blue: { body: '#6FB6E8', dark: '#3E86BD', belly: '#D7ECFA' },
  orange: { body: '#F5A85A', dark: '#C97A2C', belly: '#FDE6CC' },
  purple: { body: '#B597E0', dark: '#8462BA', belly: '#EDE3FA' },
};

const SHELL = '#FFF6E5';
const SHELL_LINE = '#E8D5B0';
const INK = '#2B2B2B';

/** 오답 공룡 캐릭터 (레벨과 알 색깔에 따라 모습이 바뀜) */
export function DinoView({
  level,
  color,
  size = 180,
  sleeping = false,
}: {
  level: number;
  color: EggColor;
  size?: number;
  sleeping?: boolean;
}) {
  const p = PALETTE[color] ?? PALETTE.green;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityLabel="내 공룡">
      <Ellipse cx={100} cy={186} rx={62} ry={8} fill="#000" opacity={0.08} />
      {level <= 1 ? <Egg p={p} /> : level === 2 ? <Baby p={p} sleeping={sleeping} /> : <Grown p={p} big={level >= 4} sleeping={sleeping} />}
    </Svg>
  );
}

type P = (typeof PALETTE)[EggColor];

function Eye({ x, y, sleeping }: { x: number; y: number; sleeping: boolean }) {
  if (sleeping) {
    return <Path d={`M${x - 6} ${y} Q${x} ${y + 5} ${x + 6} ${y}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />;
  }
  return (
    <G>
      <Circle cx={x} cy={y} r={6} fill={INK} />
      <Circle cx={x + 2} cy={y - 2} r={2} fill="#FFF" />
    </G>
  );
}

function Egg({ p }: { p: P }) {
  return (
    <G>
      <Ellipse cx={100} cy={112} rx={56} ry={72} fill={SHELL} stroke={SHELL_LINE} strokeWidth={3} />
      <Circle cx={78} cy={84} r={11} fill={p.body} />
      <Circle cx={122} cy={104} r={15} fill={p.body} />
      <Circle cx={88} cy={140} r={9} fill={p.body} />
      <Circle cx={128} cy={150} r={7} fill={p.body} />
      <Circle cx={110} cy={68} r={6} fill={p.body} />
    </G>
  );
}

function Baby({ p, sleeping }: { p: P; sleeping: boolean }) {
  return (
    <G>
      {/* 다리 */}
      <Ellipse cx={80} cy={170} rx={13} ry={9} fill={p.dark} />
      <Ellipse cx={120} cy={170} rx={13} ry={9} fill={p.dark} />
      {/* 몸 */}
      <Ellipse cx={100} cy={140} rx={42} ry={34} fill={p.body} />
      <Ellipse cx={100} cy={147} rx={25} ry={20} fill={p.belly} />
      {/* 머리 */}
      <Circle cx={100} cy={86} r={42} fill={p.body} />
      <Polygon points="84,46 92,30 100,45" fill={p.dark} />
      <Polygon points="100,44 110,28 116,46" fill={p.dark} />
      <Eye x={85} y={84} sleeping={sleeping} />
      <Eye x={115} y={84} sleeping={sleeping} />
      <Circle cx={74} cy={100} r={6} fill="#F7A1A1" opacity={0.6} />
      <Circle cx={126} cy={100} r={6} fill="#F7A1A1" opacity={0.6} />
      <Path d="M92 104 Q100 111 108 104" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* 깨진 알껍데기 */}
      <Path
        d="M56 150 L66 140 L76 152 L88 140 L100 152 L112 140 L124 152 L134 140 L144 150 L140 178 Q100 192 60 178 Z"
        fill={SHELL}
        stroke={SHELL_LINE}
        strokeWidth={3}
      />
    </G>
  );
}

function Grown({ p, big, sleeping }: { p: P; big: boolean; sleeping: boolean }) {
  const s = big ? 1.12 : 1;
  return (
    <G transform={`translate(${100 - 100 * s} ${180 - 180 * s}) scale(${s})`}>
      {/* 꼬리 */}
      <Path d="M138 138 Q178 132 188 104 Q172 146 136 158 Z" fill={p.body} />
      {/* 등 가시 */}
      <Polygon points="86,96 96,78 106,96" fill={p.dark} />
      <Polygon points="106,98 118,80 128,100" fill={p.dark} />
      <Polygon points="126,106 140,90 146,112" fill={p.dark} />
      {big ? <Polygon points="144,118 162,106 160,128" fill={p.dark} /> : null}
      {/* 몸 */}
      <Ellipse cx={110} cy={138} rx={48} ry={36} fill={p.body} />
      <Ellipse cx={100} cy={146} rx={28} ry={22} fill={p.belly} />
      {/* 다리 */}
      <Ellipse cx={88} cy={174} rx={14} ry={10} fill={p.dark} />
      <Ellipse cx={128} cy={174} rx={14} ry={10} fill={p.dark} />
      {/* 팔 */}
      <Ellipse cx={74} cy={140} rx={8} ry={12} fill={p.dark} />
      {/* 목·머리 */}
      <Ellipse cx={74} cy={110} rx={20} ry={26} fill={p.body} />
      <Ellipse cx={62} cy={78} rx={36} ry={30} fill={p.body} />
      <Eye x={56} y={72} sleeping={sleeping} />
      <Circle cx={36} cy={80} r={3} fill={p.dark} />
      <Path d="M34 92 Q50 100 66 92" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={74} cy={88} r={6} fill="#F7A1A1" opacity={0.6} />
    </G>
  );
}
