import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, SchoolStats, AttendanceChartPoint } from '../../../data/services/dashboard.service';
import { Subject, forkJoin, takeUntil } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats: SchoolStats | null = null;
  chartData: AttendanceChartPoint[] = [];
  loading = true;
  error = '';

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    forkJoin({
      stats: this.dashboardService.getStats(),
      chart: this.dashboardService.getAttendanceChartData(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ stats, chart }) => {
          this.stats = stats;
          this.chartData = chart;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Failed to load dashboard data';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chart helpers ──

  get maxChartValue(): number {
    if (!this.chartData.length) return 1;
    return Math.max(...this.chartData.map(d => d.total)) || 1;
  }

  barHeight(value: number): number {
    return Math.round((value / this.maxChartValue) * 100);
  }

  shortDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // ── Fee chart helpers ──

  get feeCollectedPct(): number {
    if (!this.stats) return 0;
    const { total_due, total_collected } = this.stats.financials;
    return total_due > 0 ? Math.round((total_collected / total_due) * 100) : 0;
  }

  get feePendingPct(): number {
    return 100 - this.feeCollectedPct;
  }

  // ── Format helpers ──

  formatCurrency(n: number): string {
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toFixed(0);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }
}
