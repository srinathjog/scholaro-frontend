import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SettingsService,
  BrandingSettings,
  UpdateBrandingPayload,
} from '../../../data/services/settings.service';

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branding.component.html',
})
export class BrandingComponent implements OnInit {
  loading = true;
  saving = false;
  saved = false;
  error = '';

  logoUrl: string | null = null;
  logoPreview: string | null = null;
  primaryColor = '#3B82F6';
  secondaryColor = '#10B981';
  schoolMotto = '';
  contactPhone = '';

  private cdr = inject(ChangeDetectorRef);

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.settingsService.getBranding().subscribe({
      next: (s) => {
        this.logoUrl = s.logo_url;
        this.logoPreview = s.logo_url;
        this.primaryColor = s.primary_color;
        this.secondaryColor = s.secondary_color;
        this.schoolMotto = s.school_motto || '';
        this.contactPhone = s.contact_phone || '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  logoUploading = false;
  logoUploadError = '';

  onLogoDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.uploadLogoFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.uploadLogoFile(file);
    }
  }

  removeLogo(): void {
    this.logoUrl = null;
    this.logoPreview = null;
  }

  private uploadLogoFile(file: File): void {
    this.logoUploading = true;
    this.logoUploadError = '';
    // Show local preview immediately while uploading
    const reader = new FileReader();
    reader.onload = () => { this.logoPreview = reader.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);

    this.settingsService.uploadLogo(file).subscribe({
      next: ({ url }) => {
        this.logoUrl = url;
        this.logoPreview = url;
        this.logoUploading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.logoUploadError = err.error?.message || 'Logo upload failed. Please try again.';
        this.logoUploading = false;
        this.logoPreview = null;
        this.cdr.detectChanges();
      },
    });
  }

  save(): void {
    this.saving = true;
    this.saved = false;
    this.error = '';

    const payload: UpdateBrandingPayload = {
      logo_url: this.logoUrl || undefined,
      primary_color: this.primaryColor,
      secondary_color: this.secondaryColor,
      school_motto: this.schoolMotto || undefined,
      contact_phone: this.contactPhone || undefined,
    };

    this.settingsService.updateBranding(payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.saved = false;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to save branding';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }
}
