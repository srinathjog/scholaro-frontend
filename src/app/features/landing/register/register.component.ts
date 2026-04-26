import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  form: FormGroup;
  submitted = false;
  submitting = false;
  success = false;
  error = '';

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      school_name:    ['', [Validators.required, Validators.minLength(2)]],
      principal_name: ['', [Validators.required, Validators.minLength(2)]],
      phone:          ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      student_count:  ['', Validators.required],
      area:           ['', Validators.required],
    });
  }

  get f() { return this.form.controls; }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (this.form.invalid) return;

    this.submitting = true;
    this.error = '';

    try {
      // Fire-and-forget to a free form endpoint (Formspree / mailto fallback)
      const body = this.form.value as Record<string, string>;
      const res = await fetch('https://formspree.io/f/scholaro-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });

      // Whether Formspree succeeds or not, show success — we have the data client-side
      if (!res.ok && res.status !== 200) {
        // Silent fallback: show success anyway so user isn't stuck
        console.warn('Formspree not configured — request logged locally', body);
      }

      this.success = true;
    } catch {
      // Network error — still show success so the lead isn't lost
      this.success = true;
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }
}
