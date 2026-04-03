import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SuperAdminService, PlatformStats } from '../../../data/services/super-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './super-admin-dashboard.component.html',
})
export class SuperAdminDashboardComponent implements OnInit, OnDestroy {
  stats: PlatformStats | null = null;
  loading = true;
  error = '';

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private superAdminService: SuperAdminService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.superAdminService
      .getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.stats = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Failed to load platform data';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  statusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'trial': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'suspended': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  daysAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return days + ' days ago';
  }

  logout(): void {
    this.authService.logout();
  }
}
