import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface MuscleVolumeData {
  muscle: string;
  thisWeek: number;
  lastWeek: number;
}

interface Props {
  data: MuscleVolumeData[];
  title?: string;
  loading?: boolean;
  error?: string | null;
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
      <div>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
      </div>
    </div>
  );
}
