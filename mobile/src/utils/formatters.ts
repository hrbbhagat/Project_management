/**
 * Data and date formatting utilities
 */

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'No due date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatStatus = (status: string): string => {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};
