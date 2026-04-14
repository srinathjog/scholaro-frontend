import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ParentService, ParentChild } from '../../../data/services/parent.service';
import { todayLocal } from '../../../utils/date.util';
import { Fee } from '../../../data/services/fee.service';
import { environment } from '../../../../environments/environment';

interface FeesSummary {
  total_due: number;
  total_paid: number;
  current_balance: number;
}

interface StudentFeesResponse {
  fees: Fee[];
  summary: FeesSummary;
}

@Component({
  selector: 'app-parent-fees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parent-fees.component.html',
})
export class ParentFeesComponent implements OnInit {
  // Data
  children: ParentChild[] = [];
  selectedChild: ParentChild | null = null;
  fees: Fee[] = [];
  summary: FeesSummary | null = null;

  // UI state
  loading = false;
  loadingChildren = true;
  errorMessage = '';

  // Receipt modal
  showReceiptModal = false;
  receiptFee: Fee | null = null;

  // Pay modal (Razorpay/Stripe placeholder)
  showPayModal = false;
  payFee: Fee | null = null;

  // School contact
  schoolPhone = '';

  constructor(
    private parentService: ParentService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadChildren();
    this.http.get<any>(`${environment.apiUrl}/settings/branding`).subscribe({
      next: (s) => { this.schoolPhone = s.contact_phone || ''; this.cdr.detectChanges(); },
    });
  }

  private loadChildren(): void {
    this.loadingChildren = this.children.length === 0;
    this.parentService.getMyChildren().subscribe({
      next: (children) => {
        this.children = children;
        this.loadingChildren = false;
        if (children.length === 1) this.selectChild(children[0]);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load children.';
        this.loadingChildren = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectChild(child: ParentChild): void {
    this.selectedChild = child;
    this.loadFees();
  }

  loadFees(): void {
    if (!this.selectedChild) return;
    this.loading = this.fees.length === 0;
    this.errorMessage = '';

    this.parentService.getStudentFees(this.selectedChild.id).subscribe({
      next: (data) => {
        this.fees = data.fees;
        this.summary = data.summary;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Could not load fee information.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Receipt modal ──
  openReceipt(fee: Fee): void {
    this.receiptFee = fee;
    this.showReceiptModal = true;
  }

  closeReceipt(): void {
    this.showReceiptModal = false;
    this.receiptFee = null;
  }

  // ── Pay modal ──
  openPay(fee: Fee): void {
    this.payFee = fee;
    this.showPayModal = true;
  }

  closePay(): void {
    this.showPayModal = false;
    this.payFee = null;
  }

  // ── Helpers ──
  getInitials(child: ParentChild): string {
    return (child.first_name?.[0] || '') + (child.last_name?.[0] || '');
  }

  formatCurrency(amount: number | string): string {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  remainingAmount(fee: Fee): number {
    return Number(fee.final_amount) - Number(fee.paid_amount);
  }

  get paidFees(): Fee[] {
    return this.fees.filter((f) => f.status === 'paid');
  }

  get unpaidFees(): Fee[] {
    return this.fees.filter((f) => f.status !== 'paid');
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'paid': return '✅';
      case 'partially_paid': return '⏳';
      case 'overdue': return '🚨';
      default: return '📄';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partially_paid': return 'Partial';
      case 'overdue': return 'Overdue';
      case 'pending': return 'Due';
      default: return status;
    }
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date(todayLocal());
  }

  get paymentProgress(): number {
    if (!this.summary || !this.summary.total_due) return 0;
    return Math.round((this.summary.total_paid / this.summary.total_due) * 100);
  }
}
