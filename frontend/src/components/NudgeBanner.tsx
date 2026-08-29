interface Props {
  messages: string[];
}

export default function NudgeBanner({ messages }: Props) {
  if (!messages || messages.length === 0) return null;

  return (
    <div className="nudge-banner">
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '16px', marginTop: '2px' }}>💡</span>
        <div style={{ flex: 1 }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: idx < messages.length - 1 ? '8px' : 0 }}>
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
