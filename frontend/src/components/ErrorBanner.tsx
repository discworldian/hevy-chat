interface Props {
  message: string;
  retryable?: boolean;
}

export default function ErrorBanner({ message, retryable }: Props) {
  return (
    <div className="error-banner">
      <strong>Error:</strong> {message}
      {retryable && ' (Try refreshing)'}
    </div>
  );
}
