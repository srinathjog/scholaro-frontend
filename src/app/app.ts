import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './data/services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    // Whenever a user logs in (or is restored from storage), fetch branding
    this.sub = this.authService.currentUser$.pipe(
      filter(user => !!user),
      switchMap(() => this.settingsService.getBranding()),
    ).subscribe({
      next: (settings) => {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', settings.primary_color);
        root.style.setProperty('--secondary-color', settings.secondary_color);
        if (settings.logo_url) {
          root.style.setProperty('--school-logo', `url(${settings.logo_url})`);
        }
        if (settings.school_motto) {
          root.style.setProperty('--school-motto', `"${settings.school_motto}"`);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Silently fall back to defaults — CSS variables remain unset or use fallbacks
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
