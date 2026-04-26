import { Component, OnInit, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-page.component.html',
})
export class LandingPageComponent implements OnInit {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private meta   = inject(Meta);
  private title  = inject(Title);

  ngOnInit(): void {
    // Redirect authenticated users straight to their dashboard
    if (this.auth.isLoggedIn()) {
      const roles = this.auth.getRoles();
      if (roles.includes('SUPER_ADMIN'))       this.router.navigate(['/super-admin']);
      else if (roles.includes('SCHOOL_ADMIN')) this.router.navigate(['/admin']);
      else if (roles.includes('TEACHER'))      this.router.navigate(['/teacher/history']);
      else if (roles.includes('PARENT'))       this.router.navigate(['/parent']);
      return;
    }

    // SEO — set per-route meta for JS-rendering crawlers (Google executes JS)
    this.title.setTitle('Scholaro — Preschool App Bangalore | Replace WhatsApp for Your School');
    this.meta.updateTag({ name: 'description', content: 'Scholaro is the WhatsApp-free digital portal for premium preschools in Bangalore. School management for Whitefield, HSR Layout & Koramangala — daily logs, attendance, fees & parent communication in one app.' });
    this.meta.updateTag({ name: 'keywords',    content: 'preschool app bangalore, school management whitefield, replace whatsapp preschool, preschool management software india, parent communication app school, daycare app bangalore' });
    this.meta.updateTag({ property: 'og:title',       content: 'Scholaro — The WhatsApp-Free Portal for Premium Preschools' });
    this.meta.updateTag({ property: 'og:description', content: 'Daily logs, attendance, fees & parent communication — without the chaos of WhatsApp groups. Built for premium preschools in Bangalore.' });
    this.meta.updateTag({ property: 'og:url',         content: 'https://scholaro.app/' });
  }
}
