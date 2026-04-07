import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { PwaService } from '../../core/services/pwa.service';
import { ParentService } from '../../data/services/parent.service';

@Component({
  selector: 'app-parent-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- iOS Push Notification Banner -->
    <div *ngIf="showNotifBanner"
         class="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg safe-area-top">
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
         class="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg safe-area-top">
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

    <div class="min-h-screen pb-16" [class.pt-14]="showInstallBanner || showNotifBanner">
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
  `],
})
export class ParentShellComponent implements OnInit {
  private pushService = inject(PushNotificationService);
  private pwaService = inject(PwaService);
  private parentService = inject(ParentService);
  private cdr = inject(ChangeDetectorRef);

  showInstallBanner = false;
  showNotifBanner = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Push notifications: auto-subscribe on Android, show banner on iOS
    if (this.pushService.isIOS && this.pushService.isStandalone) {
      // iOS PWA: needs user gesture — show banner if not already subscribed
      this.pushService.isSubscribed().then(subscribed => {
        if (!subscribed && !localStorage.getItem('scholaro_notif_dismissed')) {
          this.showNotifBanner = true;
          this.cdr.detectChanges();
        }
      });
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
