import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { PwaService } from '../../core/services/pwa.service';
import { ParentService } from '../../data/services/parent.service';
import { SettingsService } from '../../data/services/settings.service';

@Component({
  selector: 'app-parent-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- ═══ School Branded Header ═══ -->
    <header class="fixed top-0 inset-x-0 z-40 h-12 flex items-center justify-center shadow-sm safe-area-top"
            [style.background-color]="primaryColor">
      <span class="text-white font-bold text-sm tracking-wide truncate max-w-[220px]"
            [title]="schoolName">{{ schoolName || 'Scholaro' }}</span>
    </header>

    <!-- iOS Push Notification Banner -->
    <div *ngIf="showNotifBanner"
         class="fixed top-12 inset-x-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <span class="text-lg">🔔</span>
        </div>
        <p class="text-sm font-medium truncate">Tap to enable activity notifications</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button (click)="enableNotifications()"
                class="px-3 py-1.5 bg-white text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-50 transition-colors">
          Enable
        </button>
        <button (click)="dismissNotifBanner()"
                class="p-1 text-white/70 hover:text-white transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Install Banner -->
    <div *ngIf="showInstallBanner"
         class="fixed top-12 inset-x-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <p class="text-sm font-medium truncate">Add Scholaro to your Home Screen for instant updates</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button (click)="installApp()"
                class="px-3 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors">
          Install
        </button>
        <button (click)="dismissInstallBanner()"
                class="p-1 text-white/70 hover:text-white transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <div class="min-h-screen pb-16 pt-12" [class.pt-24]="showInstallBanner || showNotifBanner">
      <router-outlet></router-outlet>
    </div>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 safe-area-bottom">
      <div class="max-w-lg mx-auto flex items-center justify-around h-16">

        <a routerLink="/parent/timeline" routerLinkActive="text-orange-600" [routerLinkActiveOptions]="{exact: false}"
           class="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
          </svg>
          <span class="text-[10px] font-semibold">Timeline</span>
        </a>

        <a routerLink="/parent/fees" routerLinkActive="text-orange-600" [routerLinkActiveOptions]="{exact: false}"
           class="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-[10px] font-semibold">Fees</span>
        </a>

        <a routerLink="/parent/schedule" routerLinkActive="text-orange-600" [routerLinkActiveOptions]="{exact: false}"
           class="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="text-[10px] font-semibold">Schedule</span>
        </a>

        <a href="https://wa.me/919538004593?text=Hi%20Scholaro%20Team%2C%20I%20need%20help%20with..."
           target="_blank" rel="noopener noreferrer"
           class="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 hover:text-green-600 transition-colors">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 13.81c-.25.7-1.47 1.35-2.03 1.43-.5.07-1.13.1-1.83-.12-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.78-4.18-4.93-4.37-.14-.2-1.17-1.56-1.17-2.97 0-1.42.74-2.11 1.01-2.4.25-.27.56-.34.75-.34.19 0 .37 0 .54.01.17.01.4-.07.63.48.24.56.8 1.97.87 2.11.07.15.12.32.02.51-.09.2-.14.31-.27.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.9 1.05.93 1.93 1.22 2.21 1.36.27.14.43.12.59-.07.16-.2.68-.79.86-1.07.18-.27.36-.23.61-.14.25.1 1.58.74 1.85.88.27.14.46.2.52.31.07.12.07.66-.18 1.35z"/>
          </svg>
          <span class="text-[10px] font-semibold">Support</span>
        </a>

        <button (click)="logout()"
                class="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 hover:text-red-500 transition-colors">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="text-[10px] font-semibold">Logout</span>
        </button>

      </div>
    </nav>
  `,
  styles: [`
    .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
    .safe-area-top { padding-top: env(safe-area-inset-top, 0); }
  `],
})
export class ParentShellComponent implements OnInit {
  private pushService = inject(PushNotificationService);
  private pwaService = inject(PwaService);
  private parentService = inject(ParentService);
  private settingsService = inject(SettingsService);
  private cdr = inject(ChangeDetectorRef);

  showInstallBanner = false;
  showNotifBanner = false;
  schoolName = '';
  primaryColor = '#4f46e5';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Load school name + branding
    this.schoolName = this.authService.getSchoolName();
    this.settingsService.getBranding().subscribe({
      next: (b) => {
        if (b.primary_color) this.primaryColor = b.primary_color;
        this.cdr.detectChanges();
      },
      error: () => {},
    });

    // Push notifications: auto-subscribe on Android, show banner on iOS
    if (this.pushService.isIOS && this.pushService.isStandalone) {
      // iOS PWA: needs user gesture — show banner if not already subscribed
      this.pushService.isSubscribed().then(subscribed => {
        if (!subscribed && !localStorage.getItem('scholaro_notif_dismissed')) {
          this.showNotifBanner = true;
          this.cdr.detectChanges();
        }
      });
    } else if (this.pushService.isIOS && !this.pushService.isStandalone) {
      // iOS Safari: show install prompt instead (push won't work without Add to Home Screen)
      if (!localStorage.getItem('scholaro_install_dismissed')) {
        this.showInstallBanner = true;
        this.cdr.detectChanges();
      }
    } else if (!this.pushService.isIOS) {
      // Android/desktop: auto-subscribe silently
      this.pushService.subscribe();
    }

    // Show install banner if app is installable and user hasn't dismissed it
    if (!localStorage.getItem('scholaro_install_dismissed')) {
      this.pwaService.showInstallPrompt$.subscribe(installable => {
        this.showInstallBanner = installable;
        this.cdr.detectChanges();
      });
    }

    // ── Eager prefetch: prime caches silently so tab switching is instant ──
    this.parentService.getMyChildren().subscribe(children => {
      if (!children?.length) return;
      const child = children[0];
      // Pre-fetch fees for the first child
      this.parentService.getStudentFees(child.id).subscribe();
      // Pre-fetch today's timeline for the first enrollment
      if (child.enrollments?.length) {
        const e = child.enrollments[0];
        this.parentService.getTimeline(e.id, e.class_id, undefined, child.id).subscribe();
      }
    });
  }

  async installApp(): Promise<void> {
    await this.pwaService.installApp();
    this.showInstallBanner = false;
    this.cdr.detectChanges();
  }

  dismissInstallBanner(): void {
    this.showInstallBanner = false;
    localStorage.setItem('scholaro_install_dismissed', 'true');
    this.cdr.detectChanges();
  }

  async enableNotifications(): Promise<void> {
    const success = await this.pushService.subscribe();
    this.showNotifBanner = false;
    if (!success) {
      console.warn('Push subscription failed on iOS');
    }
    this.cdr.detectChanges();
  }

  dismissNotifBanner(): void {
    this.showNotifBanner = false;
    localStorage.setItem('scholaro_notif_dismissed', 'true');
    this.cdr.detectChanges();
  }

  logout(): void {
    this.parentService.clearCache();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
