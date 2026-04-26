import { Component, HostListener } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50">

      <!-- ══════════ Mobile Top Bar (< 1024px) ══════════ -->
      <header class="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
        <button (click)="sidebarOpen = true"
                class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors -ml-1">
          <svg class="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span class="text-sm text-white font-bold">{{ schoolInitial }}</span>
          </div>
          <span class="text-sm font-bold text-gray-900 truncate max-w-[140px]">{{ schoolDisplayName }}</span>
        </div>
      </header>

      <!-- ══════════ Mobile Overlay Backdrop ══════════ -->
      <div *ngIf="sidebarOpen"
           (click)="sidebarOpen = false"
           class="lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity"
           [class.animate-fade-in]="sidebarOpen"></div>

      <!-- ══════════ Sidebar ══════════ -->
      <aside [class]="sidebarClasses">
        <!-- Close button (mobile only) -->
        <button (click)="sidebarOpen = false"
                class="lg:hidden absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Logo -->
        <div class="px-5 py-5 border-b border-gray-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <span class="text-base text-white font-bold">{{ schoolInitial }}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-900 truncate" [title]="schoolName">{{ schoolDisplayName }}</p>
              <ng-container *ngIf="authService.currentUser$ | async as user">
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-0.5"
                  [ngClass]="{
                    'bg-red-100 text-red-600': user.role === 'SCHOOL_ADMIN',
                    'bg-blue-100 text-blue-600': user.role === 'TEACHER',
                    'bg-green-100 text-green-600': user.role === 'PARENT'
                  }"
                >
                  {{ user.role === 'SCHOOL_ADMIN' ? 'School Admin' : (user.role === 'TEACHER' ? 'Teacher' : (user.role === 'PARENT' ? 'Parent' : user.role)) }}
                </span>
                <p class="text-xs text-gray-500 break-all mt-0.5">{{ user.email }}</p>
              </ng-container>
            </div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <a routerLink="/admin" routerLinkActive="bg-indigo-50 text-indigo-700" [routerLinkActiveOptions]="{exact: true}"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
            Dashboard
          </a>

          <a routerLink="/admin/students" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197V21" />
            </svg>
            Students
          </a>

          <a routerLink="/admin/staff" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Staff
          </a>

          <a routerLink="/admin/parents" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Parents
          </a>

          <a routerLink="/admin/bulk-upload" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Bulk Upload
          </a>

          <a routerLink="/admin/academic-years" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Academic Years
          </a>

          <a routerLink="/admin/classes" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Classes
          </a>

          <a routerLink="/admin/reports/attendance" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m4-4H8m10-5H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2z" />
            </svg>
            Reports
          </a>

          <a routerLink="/admin/teacher-assignments" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Assignments
          </a>

          <a routerLink="/admin/fees" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Fees
          </a>

          <a routerLink="/admin/calendar" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Events Calendar
          </a>

          <a routerLink="/admin/feed" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
            </svg>
            Global Feed
          </a>


          <a routerLink="/admin/settings" routerLinkActive="bg-indigo-50 text-indigo-700"
             (click)="onNavClick()"
             class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </a>
        </nav>

        <!-- Bottom -->
        <div class="px-3 py-4 border-t border-gray-100">
          <button (click)="logout()"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full">
            <svg class="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
          <p class="text-[9px] text-gray-300 text-center mt-3 tracking-wide">Powered by Scholaro</p>
        </div>
      </aside>

      <!-- ══════════ Main Content ══════════ -->
      <main class="lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    /* Sidebar base styles */
    :host ::ng-deep .admin-sidebar {
      @apply w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50;
      transition: transform 0.25s ease-in-out;
    }

    /* Mobile: hidden off-screen by default */
    @media (max-width: 1023px) {
      :host ::ng-deep .admin-sidebar {
        transform: translateX(-100%);
      }
      :host ::ng-deep .admin-sidebar.sidebar-open {
        transform: translateX(0);
      }
    }

    /* Desktop: always visible */
    @media (min-width: 1024px) {
      :host ::ng-deep .admin-sidebar {
        transform: translateX(0);
      }
    }
  `],
})
export class AdminShellComponent {
  sidebarOpen = false;
  schoolName = '';

  constructor(
    public authService: AuthService,
    private router: Router,
  ) {
    this.schoolName = this.authService.getSchoolName();
    // Auto-close sidebar on navigation (mobile)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
    ).subscribe(() => {
      this.sidebarOpen = false;
    });
  }

  get schoolDisplayName(): string {
    const name = this.schoolName || 'Scholaro';
    return name.length > 15 ? name.split(' ')[0] : name;
  }

  get schoolInitial(): string {
    return (this.schoolName || 'S')[0].toUpperCase();
  }

  get sidebarClasses(): string {
    const base = 'admin-sidebar w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50';
    return this.sidebarOpen ? `${base} sidebar-open` : base;
  }

  /** Close sidebar when clicking a nav link (mobile drawer) */
  onNavClick(): void {
    if (window.innerWidth < 1024) {
      this.sidebarOpen = false;
    }
  }

  /** Close sidebar on Escape key */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
  }
}
