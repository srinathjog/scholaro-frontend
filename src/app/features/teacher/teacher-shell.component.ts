import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService } from '../../data/services/activity.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-teacher-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- Mobile Top Bar -->
      <header class="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
        <button (click)="sidebarOpen = true"
                class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors -ml-1">
          <svg class="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <span class="text-sm text-white font-bold">S</span>
          </div>
          <span class="text-sm font-bold text-gray-900">Scholaro</span>
        </div>
      </header>

      <!-- Mobile Overlay -->
      <div *ngIf="sidebarOpen"
           (click)="sidebarOpen = false"
           class="lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"></div>

      <!-- Sidebar -->
      <aside [class]="sidebarClasses">
        <button (click)="sidebarOpen = false"
                class="lg:hidden absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="px-5 py-5 border-b border-gray-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
              <span class="text-base text-white font-bold">S</span>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900">Scholaro</p>
              <p class="text-[10px] text-gray-400 uppercase tracking-wider">Teacher</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <a routerLink="/teacher/history" routerLinkActive="bg-teal-50 text-teal-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            Posts
          </a>
          <a routerLink="/teacher/create" routerLinkActive="bg-teal-50 text-teal-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </a>
          <a routerLink="/teacher/logs" routerLinkActive="bg-teal-50 text-teal-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Daily Logs
          </a>
          <a routerLink="/teacher/attendance" routerLinkActive="bg-teal-50 text-teal-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Attendance
          </a>
          <a routerLink="/teacher/pickup" routerLinkActive="bg-teal-50 text-teal-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Pickup
          </a>
        </nav>

        <div class="px-3 py-4 border-t border-gray-100">
          <button (click)="logout()"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host ::ng-deep .teacher-sidebar {
      @apply w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50;
      transition: transform 0.25s ease-in-out;
    }
    @media (max-width: 1023px) {
      :host ::ng-deep .teacher-sidebar { transform: translateX(-100%); }
      :host ::ng-deep .teacher-sidebar.sidebar-open { transform: translateX(0); }
    }
    @media (min-width: 1024px) {
      :host ::ng-deep .teacher-sidebar { transform: translateX(0); }
    }
  `],
})
export class TeacherShellComponent implements OnInit {
  sidebarOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private activityService: ActivityService,
  ) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.sidebarOpen = false;
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (user?.userId) {
        this.activityService.getClassesByTeacher(user.userId).subscribe();
      }
    });
  }

  get sidebarClasses(): string {
    const base = 'teacher-sidebar w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50';
    return this.sidebarOpen ? `${base} sidebar-open` : base;
  }

  onNavClick(): void {
    if (window.innerWidth < 1024) this.sidebarOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void { this.sidebarOpen = false; }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
