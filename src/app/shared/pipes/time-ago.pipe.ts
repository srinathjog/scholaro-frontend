import { Pipe, PipeTransform } from '@angular/core';

/**
 * Smart timeline date pipe.
 *
 * - < 60s:       "Just now"
 * - < 60m:       "5 mins ago"
 * - < 12h:       "3 hours ago"
 * - Today:       "Today at 1:37 PM"
 * - Yesterday:   "Yesterday at 1:37 PM"
 * - Older:       "Friday, 24 Apr at 1:37 PM"
 *
 * Usage: {{ item.created_at | timeAgo }}
 */
@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    const d = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    if (diffMs < 0) return 'Just now';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 12) return `${hours} hours ago`;

    // Compare calendar dates in local time
    const timeStr = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (dStart.getTime() === todayStart.getTime()) {
      return `Today at ${timeStr}`;
    }
    if (dStart.getTime() === yesterdayStart.getTime()) {
      return `Yesterday at ${timeStr}`;
    }

    // Older — "Friday, 24 Apr at 1:37 PM"
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    return `${dayName}, ${dayNum} ${month} at ${timeStr}`;
  }
}
