import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TenantService } from '../../../core/services/tenant.service';
import { Router } from '@angular/router';

interface Lead {
  id: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  child_name: string;
  child_dob: string | null;
  expected_class: string | null;
  status: 'new' | 'contacted' | 'visited' | 'enrolled' | 'closed';
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  new:       { label: 'New',       bg: 'bg-blue-100',   text: 'text-blue-700' },
  contacted: { label: 'Contacted', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  visited:   { label: 'Visited',   bg: 'bg-purple-100', text: 'text-purple-700' },
  enrolled:  { label: 'Enrolled',  bg: 'bg-green-100',  text: 'text-green-700' },
  closed:    { label: 'Closed',    bg: 'bg-gray-100',   text: 'text-gray-500' },
};

@Component({
  selector: 'app-inquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inquiries.component.html',
})export class InquiriesComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/leads`;

  leads: Lead[] = [];
  loading = true;
  error = '';

  // Inline add form
  showAddForm = false;
  saving = false;
  saveError = '';

  newParentName = '';
  newParentPhone = '';
  newParentEmail = '';
  newChildName = '';
  newChildDob = '';
  newExpectedClass = '';
  newNotes = '';

  // Status update
  updatingId = '';

  // Filter
  filterStatus = '';

  readonly statusOptions = ['new', 'contacted', 'visited', 'enrolled', 'closed'];
  readonly classOptions = [
    'Play Group (2–3 yrs)',
    'Nursery (3–4 yrs)',
    'LKG (4–5 yrs)',
    'UKG (5–6 yrs)',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Other',
  ];

  constructor(
    private http: HttpClient,
    private tenantService: TenantService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadLeads();
  }

  get tenantCode(): string {
    // tenantId UUID is used as the code in the public URL;
    // the backend resolves both UUID and tenant_code
    return this.tenantService.getTenantId() || '';
  }

  get qrUrl(): string {
    // The public-facing URL a parent would open
    const base = environment.production
      ? 'https://scholaro.app'
      : window.location.origin;
    return `${base}/inquiry/${this.tenantCode}`;
  }

  get filteredLeads(): Lead[] {
    if (!this.filterStatus) return this.leads;
    return this.leads.filter(l => l.status === this.filterStatus);
  }

  statusConfig(status: string) {
    return STATUS_CONFIG[status] || STATUS_CONFIG['new'];
  }

  loadLeads(): void {
    this.loading = true;
    this.http.get<Lead[]>(this.api).subscribe({
      next: (data) => {
        this.leads = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load inquiries.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  updateStatus(lead: Lead, status: string): void {
    this.updatingId = lead.id;
    this.http.patch(`${this.api}/${lead.id}`, { status }).subscribe({
      next: () => {
        lead.status = status as Lead['status'];
        this.updatingId = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.updatingId = '';
        this.cdr.detectChanges();
      },
    });
  }

  get addFormValid(): boolean {
    return this.newParentName.trim().length > 0 &&
           this.newParentPhone.trim().length >= 10 &&
           this.newChildName.trim().length > 0;
  }

  submitManual(): void {
    if (!this.addFormValid || this.saving) return;
    this.saving = true;
    this.saveError = '';
    const payload = {
      parent_name: this.newParentName.trim(),
      parent_phone: this.newParentPhone.trim(),
      parent_email: this.newParentEmail.trim() || undefined,
      child_name: this.newChildName.trim(),
      child_dob: this.newChildDob || undefined,
      expected_class: this.newExpectedClass || undefined,
      notes: this.newNotes.trim() || undefined,
    };
    this.http.post<Lead>(this.api, payload).subscribe({
      next: (lead) => {
        this.leads.unshift(lead);
        this.saving = false;
        this.showAddForm = false;
        this.resetAddForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saveError = err.error?.message || 'Failed to save inquiry.';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  private resetAddForm(): void {
    this.newParentName = '';
    this.newParentPhone = '';
    this.newParentEmail = '';
    this.newChildName = '';
    this.newChildDob = '';
    this.newExpectedClass = '';
    this.newNotes = '';
    this.saveError = '';
  }

  copyQrUrl(): void {
    navigator.clipboard.writeText(this.qrUrl).catch(() => {});
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Count leads by status for the summary bar
  countByStatus(status: string): number {
    return this.leads.filter(l => l.status === status).length;
  }

  // ── Convert to Student ──────────────────────────────────────────────────
  // The slide-over was replaced by full-page registration for better UX.
  // State is passed via Angular Router so StudentRegisterComponent can pre-fill.

  registerAsStudent(lead: Lead): void {
    const parts = lead.child_name.trim().split(/\s+/);
    const lastName  = parts.length > 1 ? parts.pop()! : '';
    const firstName = parts.join(' ');

    this.router.navigate(['/admin/students/register'], {
      state: {
        prefillFromLead: {
          leadId:       lead.id,
          firstName,
          lastName,
          dob:          lead.child_dob  || '',
          expectedClass: lead.expected_class || '',
          parentName:   lead.parent_name,
          parentPhone:  lead.parent_phone,
          parentEmail:  lead.parent_email || '',
        },
      },
    });
  }
}
