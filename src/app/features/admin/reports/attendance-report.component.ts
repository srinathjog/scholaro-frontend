import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService, SchoolClass } from '../../../data/services/academic.service';
import { AttendanceService } from '../../../data/services/attendance.service';
import * as XLSX from 'xlsx';

export interface MonthlyAttendanceSummary {
  studentName: string;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
}

@Component({
  selector: 'app-attendance-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-6 lg:px-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm text-indigo-600 uppercase tracking-[0.2em]">Reports</p>
          <h1 class="text-3xl font-semibold text-slate-900">Monthly Attendance Summary</h1>
          <p class="mt-2 text-sm text-slate-600 max-w-2xl">Choose a class and month to review attendance patterns, then export the results to Excel for meetings and official records.</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          (click)="exportExcel()"
          [disabled]="!reportData.length">
          <span class="text-base">📥</span>
          Export to Excel
        </button>
      </div>

      <section class="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="grid gap-4 lg:grid-cols-[320px_220px] xl:grid-cols-[320px_220px_260px] items-end">
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Class</span>
            <select
              class="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              [(ngModel)]="selectedClassId"
              (change)="onFiltersChange()">
              <option value="">Select a class</option>
              <option *ngFor="let item of classes" [value]="item.id">{{ item.name }}</option>
            </select>
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Month</span>
            <input
              type="month"
              class="mt-2 block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              [(ngModel)]="month"
              (change)="onFiltersChange()" />
          </label>

          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Rows</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ reportData.length }}</p>
            </div>
            <div class="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Class</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ selectedClassName || 'None' }}</p>
            </div>
          </div>
        </div>

        <div class="mt-6 overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-sm font-semibold text-slate-600">Student Name</th>
                <th class="px-4 py-3 text-sm font-semibold text-slate-600">Days Present</th>
                <th class="px-4 py-3 text-sm font-semibold text-slate-600">Days Absent</th>
                <th class="px-4 py-3 text-sm font-semibold text-slate-600">% Score</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              <tr *ngFor="let row of reportData" class="hover:bg-slate-50">
                <td class="px-4 py-4 text-sm text-slate-900">{{ row.studentName }}</td>
                <td class="px-4 py-4 text-sm text-slate-900">{{ row.presentCount }}</td>
                <td class="px-4 py-4 text-sm text-slate-900">{{ row.absentCount }}</td>
                <td class="px-4 py-4 text-sm font-semibold text-slate-900">{{ row.percentage }}%</td>
              </tr>
              <tr *ngIf="!reportData.length">
                <td colspan="4" class="px-4 py-10 text-center text-sm text-slate-500">Select a class and month to view attendance summary.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class AttendanceReportComponent implements OnInit {
  classes: SchoolClass[] = [];
  selectedClassId = '';
  selectedClassName = '';
  month = new Date().toISOString().slice(0, 7);
  reportData: MonthlyAttendanceSummary[] = [];

  constructor(
    private academicService: AcademicService,
    private attendanceService: AttendanceService,
  ) {}

  ngOnInit(): void {
    this.academicService.getClasses().subscribe((classes) => {
      this.classes = classes;
      if (classes.length && !this.selectedClassId) {
        this.selectedClassId = classes[0].id;
        this.selectedClassName = classes[0].name;
        this.loadReport();
      }
    });
  }

  onFiltersChange(): void {
    const selected = this.classes.find((c) => c.id === this.selectedClassId);
    this.selectedClassName = selected?.name ?? '';
    this.loadReport();
  }

  private loadReport(): void {
    if (!this.selectedClassId || !this.month) {
      this.reportData = [];
      return;
    }

    const [year, month] = this.month.split('-');
    if (!year || !month) {
      this.reportData = [];
      return;
    }

    this.attendanceService.getMonthlyReport(this.selectedClassId, month, year).subscribe({
      next: (data) => {
        this.reportData = data;
      },
      error: () => {
        this.reportData = [];
      },
    });
  }

  exportExcel(): void {
    if (!this.reportData.length) {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      this.reportData.map((row) => ({
        'Student Name': row.studentName,
        'Days Present': row.presentCount,
        'Days Absent': row.absentCount,
        'Attendance %': `${row.percentage}%`,
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    const fileName = `attendance-${this.selectedClassName || 'report'}-${this.month}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}
