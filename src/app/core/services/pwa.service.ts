import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaService {
  private deferredPrompt: any = null;
  private installable$ = new BehaviorSubject<boolean>(false);
  private installed$ = new BehaviorSubject<boolean>(false);

  /** Observable: true when the browser offers to install the app */
  readonly showInstallPrompt$ = this.installable$.asObservable();

  /** Observable: true after the user has installed the app */
  readonly appInstalled$ = this.installed$.asObservable();

  constructor() {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.installed$.next(true);
      return;
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.installable$.next(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.installable$.next(false);
      this.installed$.next(true);
    });
  }

  /** Trigger the browser's native install dialog */
  async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.installable$.next(false);

    return result.outcome === 'accepted';
  }
}
