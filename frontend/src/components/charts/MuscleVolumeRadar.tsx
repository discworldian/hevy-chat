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

// Curved region labels component
function RegionLabels() {
  const regions = [
    { name: 'UPPER', angle: 90, color: 'var(--accent)' },
    { name: 'LOWER', angle: 270, color: 'var(--ok)' },
    { name: 'CORE', angle: 180, color: 'var(--text-muted)' },
  ];

  return (
    <g>
      {regions.map((region) => (
        <g key={region.name} transform={`rotate(${region.angle} 50 50)`}>
          <text
            x={50}
            y={8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill={region.color}
            opacity="0.7"
            style={{ pointerEvents: 'none' }}
          >
            {region.name}
          </text>
        </g>
      ))}
    </g>
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
      <div style={{ position: 'relative' }}>
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
            <Radar name="This Week" dataKey="thisWeek" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.5} />
            <Radar name="Last Week" dataKey="lastWeek" stroke="var(--text-muted)" fill="transparent" strokeDasharray="5 5" />
            <RegionLabels />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text)' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
