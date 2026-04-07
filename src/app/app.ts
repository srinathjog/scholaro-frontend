import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, Inject } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './data/services/settings.service';
import { environment } from '../environments/environment';

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
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnInit(): void {
    this.setupDynamicBranding();

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

  private setupDynamicBranding(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) return;

    const apiUrl = environment.apiUrl;
    const head = this.document.head;

    // Swap manifest to school-specific dynamic manifest
    let manifest = head.querySelector('link[rel="manifest"]');
    if (manifest) {
      manifest.setAttribute('href', `${apiUrl}/tenants/manifest/${code.toUpperCase()}`);
    }

    // iOS: update apple-touch-icon (fetch logo from manifest endpoint)
    fetch(`${apiUrl}/tenants/manifest/${code.toUpperCase()}`)
      .then(res => res.json())
      .then(data => {
        const logoUrl = data.icons?.[0]?.src;
        if (!logoUrl) return;

        let appleIcon = head.querySelector('link[rel="apple-touch-icon"]');
        if (!appleIcon) {
          appleIcon = this.document.createElement('link');
          appleIcon.setAttribute('rel', 'apple-touch-icon');
          head.appendChild(appleIcon);
        }
        appleIcon.setAttribute('href', logoUrl);

        // Also update theme-color meta tag
        const themeMeta = head.querySelector('meta[name="theme-color"]');
        if (themeMeta && data.theme_color) {
          themeMeta.setAttribute('content', data.theme_color);
        }
      })
      .catch(() => { /* fall back to defaults silently */ });
  }
}
