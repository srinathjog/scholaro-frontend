import { Injectable, Injector } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Custom title strategy that formats the browser tab as:
 *   Authenticated: "Page Name | School Name"
 *   Public:        "Page Name | Scholaro"
 *   Fallback:      "School Name | Scholaro" or "Scholaro"
 *
 * AuthService is resolved lazily via Injector to break the circular DI cycle:
 *   AuthService -> Router -> TitleStrategy -> AuthService
 */
@Injectable({ providedIn: 'root' })
export class ScholaroTitleStrategy extends TitleStrategy {
  constructor(
    private readonly title: Title,
    private readonly injector: Injector,
  ) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    // Lazy resolution avoids the circular dependency at construction time
    const schoolName = this.injector.get(AuthService).getSchoolName();

    if (pageTitle) {
      this.title.setTitle(schoolName ? `${pageTitle} | ${schoolName}` : `${pageTitle} | Scholaro`);
    } else {
      this.title.setTitle(schoolName ? `${schoolName} | Scholaro` : 'Scholaro');
    }
  }
}
