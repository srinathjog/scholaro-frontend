import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { firstValueFrom, Observable, Subject, EMPTY } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private http = inject(HttpClient);
  private swPush = inject(SwPush, { optional: true });

  /** Emits when a push message arrives while the app is in the foreground */
  private readonly _onMessage$ = new Subject<any>();
  readonly onMessage$: Observable<any> = this._onMessage$.asObservable();

  constructor() {
    // Listen for foreground push messages via Angular's SwPush
    if (this.swPush?.messages) {
      this.swPush.messages.subscribe((msg) => {
        console.log('[Push] Foreground message received:', msg);
        this._onMessage$.next(msg);
      });
    }
    // Also listen via raw SW message events (covers iOS + non-NGSW payloads)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PUSH_RECEIVED' || event.data?.notification) {
          console.log('[Push] SW message event:', event.data);
          this._onMessage$.next(event.data);
        }
      });
    }
  }

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
    // Need service worker support at minimum
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    // iOS only supports push when installed as PWA
    if (this.isIOS && !this.isStandalone) return false;
    return true;
  }

  /**
   * Request push permission, subscribe via the push manager directly,
   * and store the subscription on the backend.
   * Uses raw PushManager API for maximum iOS compatibility.
   * Returns true if successfully subscribed.
   */
  async subscribe(): Promise<boolean> {
    console.log('[Push] subscribe called', {
      isIOS: this.isIOS,
      isStandalone: this.isStandalone,
      canSubscribe: this.canSubscribe,
      swEnabled: this.swPush?.isEnabled,
      notificationPermission: 'Notification' in window ? Notification.permission : 'N/A',
    });

    if (!this.canSubscribe) {
      if (this.isIOS && !this.isStandalone) {
        console.log('[Push] Skipped: iOS requires Add to Home Screen first');
      }
      return false;
    }

    try {
      // 1. Get VAPID public key from backend
      const { publicKey } = await firstValueFrom(
        this.http.get<{ publicKey: string }>(`${environment.apiUrl}/notifications/vapid-public-key`),
      );
      if (!publicKey) {
        console.warn('[Push] No VAPID public key returned from server');
        return false;
      }

      // 2. Wait for service worker to be fully active (critical for iOS)
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready, scope:', registration.scope);

      // 3. Check if already subscribed
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('[Push] Already subscribed, sending to backend');
        await this.sendSubscriptionToBackend(existingSub);
        return true;
      }

      // 4. Convert VAPID key to Uint8Array (required by spec, critical for iOS)
      const applicationServerKey = this.urlBase64ToUint8Array(publicKey);

      // 5. Subscribe via raw PushManager API (more reliable on iOS than SwPush wrapper)
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      console.log('[Push] Subscription created:', sub.endpoint.slice(0, 60) + '...');

      // 6. Send subscription to backend
      await this.sendSubscriptionToBackend(sub);
      console.log('[Push] Subscription registered with backend');
      return true;
    } catch (err: any) {
      console.error('[Push] Subscription failed:', err?.message || err);
      if (err?.name === 'NotAllowedError') {
        console.warn('[Push] User denied notification permission');
      }
      return false;
    }
  }

  /** Send a PushSubscription to the backend */
  private async sendSubscriptionToBackend(sub: PushSubscription): Promise<void> {
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
  }

  /** Convert a base64url-encoded string to Uint8Array (VAPID key format) */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /** Check if currently subscribed */
  async isSubscribed(): Promise<boolean> {
    if (!this.canSubscribe) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  /** Unsubscribe from push */
  async unsubscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
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
