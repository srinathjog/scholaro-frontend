import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { todayLocal } from '../../../utils/date.util';
import {
  FeeService,
  Fee,
  FeeStructure,
  Defaulter,
  DefaultersReport,
  FeeSummary,
} from '../../../data/services/fee.service';
import { AcademicService, AcademicYear } from '../../../data/services/academic.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fees.component.html',
})
export class FeesComponent implements OnInit {
  // ── Tab ──
  activeTab: 'dashboard' | 'structures' = 'dashboard';

  // ── Shared ──
  classes: { id: string; name: string }[] = [];
  loadingClasses = true;
  errorMessage = '';
  successMessage = '';

  // ═══ DASHBOARD TAB ═══
  selectedClassId = '';
  summary: FeeSummary | null = null;
  defaultersReport: DefaultersReport | null = null;
  loading = false;

  // Payment modal
  showPaymentModal = false;
  paymentFee: Fee | null = null;
  paymentStudentName = '';
  paymentAmount = '';
  paymentMethod = 'cash';
  paymentReference = '';
  paymentProcessing = false;

  // Reminder state
  sendingReminder = new Set<string>();
  reminderSent = new Set<string>();

  // ═══ STRUCTURES TAB ═══
  structures: FeeStructure[] = [];
  academicYears: AcademicYear[] = [];
  selectedYearId = '';
  loadingYears = true;
  loadingStructures = false;

  // Create modal
  showCreateModal = false;
  createForm = {
    name: '',
    description: '',
    amount: '',
    due_date: '',
    class_id: '',
    frequency: 'one_time' as 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly',
  };
  creating = false;

  // Delete confirmation
  deleteTarget: FeeStructure | null = null;
  deleting = false;

  constructor(
    private feeService: FeeService,
    private academicService: AcademicService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadClasses();
    this.loadAcademicYears();
  }

  switchTab(tab: 'dashboard' | 'structures'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ─── Load classes ──
  private loadClasses(): void {
    this.loadingClasses = true;
    this.http.get<any[]>(`${environment.apiUrl}/classes`).subscribe({
      next: (classes) => {
        this.classes = classes.map((c) => ({ id: c.id, name: c.name }));
        this.loadingClasses = false;
        if (this.classes.length > 0) {
          this.selectedClassId = this.classes[0].id;
          this.loadDashboard();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load classes.';
        this.loadingClasses = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Load academic years ──
  private loadAcademicYears(): void {
    this.loadingYears = true;
    this.academicService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYears = years;
        this.loadingYears = false;
        const active = years.find((y) => y.is_active);
        if (active) {
          this.selectedYearId = active.id;
          this.loadStructures();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingYears = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ═══════════════ DASHBOARD ═══════════════

  onClassChange(): void {
    if (this.selectedClassId) this.loadDashboard();
  }

  loadDashboard(): void {
    if (!this.selectedClassId) return;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    let loaded = 0;
    const done = () => {
      loaded++;
      if (loaded >= 2) {
        this.loading = false;
        this.cdr.detectChanges();
      }
    };

    this.feeService.getClassFeeSummary(this.selectedClassId).subscribe({
      next: (s) => { this.summary = s; done(); },
      error: () => { this.errorMessage = 'Failed to load fee summary.'; done(); },
    });

    this.feeService.getDefaultersList(this.selectedClassId).subscribe({
      next: (r) => { this.defaultersReport = r; done(); },
      error: () => { this.errorMessage = 'Failed to load defaulters.'; done(); },
    });
  }

  openPaymentModal(fee: Fee, studentName: string): void {
    this.paymentFee = fee;
    this.paymentStudentName = studentName;
    this.paymentAmount = '';
    this.paymentMethod = 'cash';
    this.paymentReference = '';
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.paymentFee = null;
  }

  get remainingBalance(): number {
    if (!this.paymentFee) return 0;
    return Number(this.paymentFee.final_amount) - Number(this.paymentFee.paid_amount);
  }

  payFull(): void {
    this.paymentAmount = this.remainingBalance.toFixed(2);
  }

  submitPayment(): void {
    if (!this.paymentFee || !this.paymentAmount) return;
    this.paymentProcessing = true;

    this.feeService.recordPayment(
      this.paymentFee.id,
      this.paymentAmount,
      this.paymentMethod,
      this.paymentReference || undefined,
    ).subscribe({
      next: () => {
        this.paymentProcessing = false;
        this.successMessage = `₹${this.paymentAmount} payment recorded successfully!`;
        this.closePaymentModal();
        this.loadDashboard();
      },
      error: (err) => {
        this.paymentProcessing = false;
        this.errorMessage = err?.error?.message || 'Payment failed.';
        this.cdr.detectChanges();
      },
    });
  }

  sendReminder(defaulter: Defaulter): void {
    this.sendingReminder.add(defaulter.enrollment_id);
    this.cdr.detectChanges();

    const feeIds = defaulter.fees.map((f) => f.id);
    let completed = 0;

    for (const feeId of feeIds) {
      this.http.post(`${environment.apiUrl}/fees/remind/${feeId}`, {}).subscribe({
        next: () => {
          completed++;
          if (completed >= feeIds.length) {
            this.sendingReminder.delete(defaulter.enrollment_id);
            this.reminderSent.add(defaulter.enrollment_id);
            this.successMessage = `Reminder sent to ${defaulter.student_name}'s parent!`;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          completed++;
          if (completed >= feeIds.length) {
            this.sendingReminder.delete(defaulter.enrollment_id);
            this.reminderSent.add(defaulter.enrollment_id);
            this.successMessage = `Reminder sent to ${defaulter.student_name}'s parent.`;
            this.cdr.detectChanges();
          }
        },
      });
    }
  }

  markOverdue(): void {
    this.feeService.markOverdue().subscribe({
      next: (result) => {
        this.successMessage = `${result.marked_overdue} fee(s) marked as overdue.`;
        this.loadDashboard();
      },
      error: () => {
        this.errorMessage = 'Failed to mark overdue fees.';
        this.cdr.detectChanges();
      },
    });
  }

  // ═══════════════ STRUCTURES ═══════════════

  onYearChange(): void {
    if (this.selectedYearId) this.loadStructures();
  }

  loadStructures(): void {
    if (!this.selectedYearId) return;
    this.loadingStructures = true;

    this.feeService.getStructures(this.selectedYearId).subscribe({
      next: (structures) => {
        this.structures = structures;
        this.loadingStructures = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load fee structures.';
        this.loadingStructures = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreateModal(): void {
    this.createForm = { name: '', description: '', amount: '', due_date: '', class_id: '', frequency: 'one_time' };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitCreate(): void {
    if (!this.createForm.name || !this.createForm.amount || !this.createForm.due_date || !this.createForm.class_id) return;
    this.creating = true;

    this.feeService.createStructure({
      academic_year_id: this.selectedYearId,
      class_id: this.createForm.class_id,
      name: this.createForm.name,
      description: this.createForm.description || undefined,
      amount: parseFloat(this.createForm.amount) as any,
      due_date: this.createForm.due_date,
      frequency: this.createForm.frequency,
    }).subscribe({
      next: () => {
        this.creating = false;
        this.successMessage = `Fee structure "${this.createForm.name}" created!`;
        this.closeCreateModal();
        this.loadStructures();
      },
      error: (err) => {
        this.creating = false;
        this.errorMessage = err?.error?.message || 'Failed to create fee structure.';
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete(structure: FeeStructure): void {
    this.deleteTarget = structure;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;

    this.feeService.deleteStructure(this.deleteTarget.id).subscribe({
      next: () => {
        this.successMessage = `Fee structure "${this.deleteTarget!.name}" deleted.`;
        this.deleteTarget = null;
        this.deleting = false;
        this.loadStructures();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete fee structure.';
        this.deleteTarget = null;
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ═══════════════ HELPERS ═══════════════

  get selectedClassName(): string {
    return this.classes.find((c) => c.id === this.selectedClassId)?.name || 'Class';
  }

  get selectedYearLabel(): string {
    return this.academicYears.find((y) => y.id === this.selectedYearId)?.year || 'Year';
  }

  get collectionRate(): number {
    if (!this.summary || !this.summary.total_billed) return 0;
    return Math.round((this.summary.total_collected / (this.summary.total_billed - this.summary.total_discount)) * 100);
  }

  get totalStructureAmount(): number {
    return this.structures.reduce((sum, s) => sum + Number(s.amount), 0);
  }

  className(classId: string): string {
    return this.classes.find((c) => c.id === classId)?.name || '';
  }

  statusColor(status: string): string {
    switch (status) {
      case 'paid': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'partially_paid': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'overdue': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partially_paid': return 'Partial';
      case 'overdue': return 'Overdue';
      case 'pending': return 'Pending';
      default: return status;
    }
  }

  formatCurrency(amount: number | string): string {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date(todayLocal());
  }

  frequencyLabel(f: string): string {
    switch (f) {
      case 'one_time': return 'One-Time';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'half_yearly': return 'Half-Yearly';
      case 'yearly': return 'Yearly';
      default: return f;
    }
  }

  frequencyColor(f: string): string {
    switch (f) {
      case 'one_time': return 'text-gray-700 bg-gray-50 border-gray-200';
      case 'monthly': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'quarterly': return 'text-violet-700 bg-violet-50 border-violet-200';
      case 'half_yearly': return 'text-teal-700 bg-teal-50 border-teal-200';
      case 'yearly': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  }
}
