import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Custom title strategy that formats the browser tab as:
 *   Authenticated: "Page Name | School Name"
 *   Public:        "Page Name | Scholaro"
 *   Fallback:      "School Name | Scholaro" or "Scholaro"
 */
@Injectable({ providedIn: 'root' })
export class ScholaroTitleStrategy extends TitleStrategy {
  constructor(
    private readonly title: Title,
    private readonly auth: AuthService,
  ) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    const schoolName = this.auth.getSchoolName();

    if (pageTitle) {
      this.title.setTitle(schoolName ? `${pageTitle} | ${schoolName}` : `${pageTitle} | Scholaro`);
    } else {
      this.title.setTitle(schoolName ? `${schoolName} | Scholaro` : 'Scholaro');
    }
  }
}
