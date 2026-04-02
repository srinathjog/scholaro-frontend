import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor(private http: HttpClient) {}

  /** Initialize push notifications — call once after login */
  async init(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported in this browser');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered');
    } catch (err) {
      console.error('Service worker registration failed:', err);
    }
  }

  /** Subscribe the user's browser and send the subscription to the backend */
  async subscribe(): Promise<boolean> {
    if (!this.swRegistration) {
      await this.init();
    }
    if (!this.swRegistration) return false;

    try {
      // 1. Get the VAPID public key from backend
      const { publicKey } = await this.http
        .get<{ publicKey: string }>(`${environment.apiUrl}/notifications/vapid-public-key`)
        .toPromise() as { publicKey: string };

      if (!publicKey) {
        console.warn('No VAPID public key configured on server');
        return false;
      }

      // 2. Subscribe in the browser
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // 3. Send the subscription to our backend
      const raw = subscription.toJSON();
      await this.http
        .post(`${environment.apiUrl}/notifications/subscribe`, {
          endpoint: raw.endpoint,
          keys: {
            p256dh: raw.keys?.['p256dh'],
            auth: raw.keys?.['auth'],
          },
        })
        .toPromise();

      console.log('Push subscription registered');
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    }
  }

  /** Check if currently subscribed */
  async isSubscribed(): Promise<boolean> {
    if (!this.swRegistration) return false;
    const sub = await this.swRegistration.pushManager.getSubscription();
    return !!sub;
  }

  /** Unsubscribe from push */
  async unsubscribe(): Promise<void> {
    if (!this.swRegistration) return;
    const sub = await this.swRegistration.pushManager.getSubscription();
    if (sub) {
      await this.http
        .delete(`${environment.apiUrl}/notifications/subscribe`, {
          body: { endpoint: sub.endpoint },
        })
        .toPromise();
      await sub.unsubscribe();
    }
  }

  /** Convert a URL-safe base64 VAPID key to a Uint8Array */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
