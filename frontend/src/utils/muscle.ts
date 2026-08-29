export function formatMuscleLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  const words = raw.split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
