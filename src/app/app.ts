import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, Inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { DOCUMENT, CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { interval, Subscription as RxSubscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { SettingsService } from './data/services/settings.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;
  private swUpdatePollSub?: RxSubscription;
  private swUpdateSub?: Subscription;

  showUpdateToast = false;

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService,
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
    private swUpdate: SwUpdate,
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

    // --- Update Toast Logic ---
    if (this.swUpdate.isEnabled) {
      this.swUpdateSub = this.swUpdate.versionUpdates.pipe(
        filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'),
      ).subscribe(() => {
        this.showUpdateToast = true;
        this.cdr.detectChanges();
      });

      // --- Background Heartbeat Polling ---
      this.swUpdatePollSub = interval(15 * 60 * 1000).subscribe(() => {
        this.swUpdate.checkForUpdate().then((updated) => {
          if (updated) {
            console.log('[PWA] Heartbeat: Update found and triggered.');
          } else {
            console.log('[PWA] Heartbeat: No update found.');
          }
        }).catch(err => {
          console.warn('[PWA] Heartbeat: Update check failed', err);
        });
      });

      // --- Unrecoverable State Handler ---
      this.swUpdate.unrecoverable.subscribe(event => {
        console.error('[PWA] Unrecoverable state detected:', event.reason);
        // Always reload to recover from a broken cache
        this.document.defaultView?.location.reload();
      });
    } else {
      console.log('[PWA] Service Worker updates are not enabled.');
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.swUpdateSub?.unsubscribe();
    this.swUpdatePollSub?.unsubscribe();
  }

  applyUpdate(): void {
    this.swUpdate.activateUpdate().then(() => {
      this.document.defaultView?.location.reload();
    }).catch(() => {
      this.document.defaultView?.location.reload();
    });
  }

  private setupDynamicBranding(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) return;                       // ← no code → leave default manifest untouched

    try {
      const apiUrl = environment.apiUrl;
      const head = this.document.head;

      // Swap manifest to school-specific dynamic manifest
      const manifest = head.querySelector('link[rel="manifest"]');
      if (manifest) {
        manifest.setAttribute('href', `${apiUrl}/tenants/manifest/${code.toUpperCase()}`);
      }

      // iOS: update apple-touch-icon + theme-color from manifest data
      fetch(`${apiUrl}/tenants/manifest/${code.toUpperCase()}`)
        .then(res => { if (!res.ok) throw new Error('manifest fetch failed'); return res.json(); })
        .then(data => {
          const logoUrl = data.icons?.[0]?.src;
          if (logoUrl) {
            let appleIcon = head.querySelector('link[rel="apple-touch-icon"]');
            if (!appleIcon) {
              appleIcon = this.document.createElement('link');
              appleIcon.setAttribute('rel', 'apple-touch-icon');
              head.appendChild(appleIcon);
            }
            appleIcon.setAttribute('href', logoUrl);
          }

          // Also update theme-color meta tag
          const themeMeta = head.querySelector('meta[name="theme-color"]');
          if (themeMeta && data.theme_color) {
            themeMeta.setAttribute('content', data.theme_color);
          }
        })
        .catch(() => { /* fall back to defaults silently */ });
    } catch (e) {
      console.warn('[Branding] Dynamic manifest injection failed, using defaults', e);
    }
  }
}
