import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface MuscleVolumeData {
  muscle: string;
  thisWeek: number;
  lastWeek: number;
}

const MUSCLE_REGIONS = {
  upper: ['chest', 'shoulders', 'triceps', 'lats', 'upper_back', 'traps', 'biceps', 'forearms'],
  lower: ['quadriceps', 'glutes', 'hamstrings', 'calves', 'lower_back'],
  core: ['abdominals', 'adductors'],
};

interface Props {
  data: MuscleVolumeData[];
  title?: string;
  loading?: boolean;
  error?: string | null;
}

// Region labels overlay using curved text paths
function RegionLabelsOverlay() {
  const radius = 42;
  const centerX = 50;
  const centerY = 50;

  // Calculate arc paths for curved text
  const createArcPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Arc path for UPPER (top, 60-120°) */}
        <path id="arcUpper" d={createArcPath(60, 120)} fill="none" />
        {/* Arc path for LOWER (bottom, 240-300°) */}
        <path id="arcLower" d={createArcPath(240, 300)} fill="none" />
        {/* Arc path for CORE (right, 150-210°) */}
        <path id="arcCore" d={createArcPath(150, 210)} fill="none" />
      </defs>

      {/* UPPER label */}
      <text
        fontSize="11"
        fontWeight="600"
        fill="var(--accent)"
        opacity="0.8"
        letterSpacing="2"
        style={{ pointerEvents: 'none' }}
      >
        <textPath href="#arcUpper" startOffset="50%" textAnchor="middle">
          UPPER BODY
        </textPath>
      </text>

      {/* LOWER label */}
      <text
        fontSize="11"
        fontWeight="600"
        fill="var(--ok)"
        opacity="0.8"
        letterSpacing="2"
        style={{ pointerEvents: 'none' }}
      >
        <textPath href="#arcLower" startOffset="50%" textAnchor="middle">
          LOWER BODY
        </textPath>
      </text>

      {/* CORE label */}
      <text
        fontSize="11"
        fontWeight="600"
        fill="var(--text-muted)"
        opacity="0.8"
        letterSpacing="2"
        style={{ pointerEvents: 'none' }}
      >
        <textPath href="#arcCore" startOffset="50%" textAnchor="middle">
          CORE
        </textPath>
      </text>
    </svg>
  );
}

export default function MuscleVolumeRadar({ data, title = 'Muscle Volume Comparison', loading, error }: Props) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading chart...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '12px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '4px', fontSize: '12px' }}>
        Error loading chart: {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
        No data available
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data} margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="muscle" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(m: string) => m.split('_').join(' ')} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-elevated)',
                border: `1px solid var(--border)`,
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '12px',
              }}
              formatter={(value: any) => (typeof value === 'number' ? value.toFixed(0) : value)}
            />
            <Radar name="this week" dataKey="thisWeek" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.5} />
            <Radar name="last week" dataKey="lastWeek" stroke="var(--text-muted)" fill="transparent" strokeDasharray="5 5" />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text)' }} />
          </RadarChart>
        </ResponsiveContainer>
        <RegionLabelsOverlay />
      </div>
    </div>
  );
}
