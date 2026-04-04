import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PushNotificationService } from '../../core/services/push-notification.service';

@Component({
  selector: 'app-parent-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen pb-16">
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

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Auto-subscribe parent for push notifications (non-blocking)
    this.pushService.subscribe();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
