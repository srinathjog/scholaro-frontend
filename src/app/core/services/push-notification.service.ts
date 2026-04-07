import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private http = inject(HttpClient);
  private swPush = inject(SwPush, { optional: true });

  /** True if the browser supports push and the service worker is active */
  get isSupported(): boolean {
    return !!this.swPush?.isEnabled;
  }

  /** iOS requires Add-to-Home-Screen + user gesture for push */
  get isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /** Check if running as installed PWA (standalone mode) */
  get isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
  }

  /** Whether push can work right now */
  get canSubscribe(): boolean {
    if (!this.isSupported) return false;
    // iOS only supports push when installed as PWA
    if (this.isIOS && !this.isStandalone) return false;
    return true;
  }

  /**
   * Request push permission, subscribe via the Angular service worker,
   * and store the subscription on the backend.
   * Returns true if successfully subscribed.
   */
  async subscribe(): Promise<boolean> {
    if (!this.canSubscribe) {
      if (this.isIOS && !this.isStandalone) {
        console.log('Push skipped: iOS requires Add to Home Screen first');
      }
      return false;
    }

    try {
      // 1. Get VAPID public key from backend
      const { publicKey } = await firstValueFrom(
        this.http.get<{ publicKey: string }>(`${environment.apiUrl}/notifications/vapid-public-key`),
      );
      if (!publicKey) return false;

      // 2. Ask browser for push permission + create subscription
      const sub = await this.swPush!.requestSubscription({
        serverPublicKey: publicKey,
      });

      // 3. Send subscription to backend
      const raw = sub.toJSON();
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/notifications/subscribe`, {
          endpoint: raw.endpoint,
          keys: {
            p256dh: raw.keys?.['p256dh'],
            auth: raw.keys?.['auth'],
          },
        }),
      );

      console.log('Push subscription registered');
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    }
  }

  /** Check if currently subscribed */
  async isSubscribed(): Promise<boolean> {
    if (!this.isSupported) return false;
    const sub = await navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription());
    return !!sub;
  }

  /** Unsubscribe from push */
  async unsubscribe(): Promise<void> {
    if (!this.isSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await firstValueFrom(
          this.http.delete(`${environment.apiUrl}/notifications/subscribe`, {
            body: { endpoint: sub.endpoint },
          }),
        );
        await sub.unsubscribe();
      }
    } catch {
      // Silently ignore
    }
  }
}
