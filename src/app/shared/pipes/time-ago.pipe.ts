import { Pipe, PipeTransform } from '@angular/core';

/**
 * Converts a date/ISO string to a human-readable relative time string.
 * "Just now", "2m ago", "1h ago", "3h ago", then falls back to shortTime for older.
 *
 * Usage: {{ item.created_at | timeAgo }}
 */
@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    const now = Date.now();
    const then = new Date(value).getTime();
    const diffMs = now - then;

    if (diffMs < 0) return 'Just now';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 12) return `${hours} hours ago`;

    // Older than 12 hours — show absolute time
    const d = new Date(value);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
}
