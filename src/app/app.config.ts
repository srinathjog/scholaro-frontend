import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CoreModule } from './core/core.module';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { ScholaroTitleStrategy } from './core/services/scholaro-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: ScholaroTitleStrategy },
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    importProvidersFrom(CoreModule), provideServiceWorker('sw-master.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerImmediately'
          }),
  ]
};
