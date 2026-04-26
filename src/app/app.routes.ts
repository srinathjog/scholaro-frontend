import { Routes } from '@angular/router';
import { RoleGuard } from './core/guards/role.guard';
import { loginGuard } from './core/guards/login.guard';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./features/landing/landing-page/landing-page.component').then(m => m.LandingPageComponent),
		title: 'Scholaro — The Smart School App',
	},
	{
		path: 'register',
		loadComponent: () => import('./features/landing/register/register.component').then(m => m.RegisterComponent),
		title: 'Request a Demo — Scholaro',
	},
	{
		path: 'login',
		component: LoginComponent,
		canActivate: [loginGuard],
		title: 'Login',
	},
	{
		path: 'forgot-password',
		loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
		title: 'Forgot Password',
	},
	{
		path: 'reset-password',
		loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
		title: 'Reset Password',
	},
	{
		path: 'feed',
		loadComponent: () => import('./activity-feed').then(m => m.ActivityFeedComponent),
		title: 'Activity Feed',
	},
	{
		path: 'admin',
		canActivate: [RoleGuard(['SCHOOL_ADMIN'])],
		loadComponent: () => import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
		children: [
			{
				path: '',
				loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
				title: 'Admin Dashboard',
			},
			{
				path: 'students',
				loadComponent: () => import('./features/admin/students/students.component').then(m => m.StudentsComponent),
				title: 'Students',
			},
			{
				path: 'students/:id',
				loadComponent: () => import('./features/admin/students/student-detail.component').then(m => m.StudentDetailComponent),
				title: 'Student Detail',
			},
			{
				path: 'staff',
				loadComponent: () => import('./features/admin/staff/staff.component').then(m => m.StaffComponent),
				title: 'Staff',
			},
			{
				path: 'parents',
				loadComponent: () => import('./features/admin/parents/parent-list/parent-list').then(m => m.ParentList),
				title: 'Manage Parents',
			},
			{
				path: 'bulk-upload',
				loadComponent: () => import('./features/admin/bulk-upload/bulk-upload.component').then(m => m.BulkUploadComponent),
				title: 'Bulk Upload',
			},
			{
				path: 'fees',
				loadComponent: () => import('./features/admin/fees/fees.component').then(m => m.FeesComponent),
				title: 'Fee Management',
			},

			{
				path: 'settings',
				loadComponent: () => import('./features/admin/settings/branding.component').then(m => m.BrandingComponent),
				title: 'Branding & Settings',
			},
			{
				path: 'classes',
				loadComponent: () => import('./features/admin/academic/class-list.component').then(m => m.ClassListComponent),
				title: 'School Structure',
			},
			{
				path: 'reports/attendance',
				loadComponent: () => import('./features/admin/reports/attendance-report.component').then(m => m.AttendanceReportComponent),
				title: 'Attendance Reports',
			},
			{
				path: 'teacher-assignments',
				loadComponent: () => import('./features/admin/academic/teacher-assignment.component').then(m => m.TeacherAssignmentComponent),
				title: 'Staff Assignment',
			},
			{
				path: 'academic-years',
				loadComponent: () => import('./features/admin/academic/academic-year-list.component').then(m => m.AcademicYearListComponent),
				title: 'Academic Years',
			},
			{
				path: 'calendar',
				loadComponent: () => import('./features/admin/calendar/admin-calendar.component').then(m => m.AdminCalendarComponent),
				title: 'Events Calendar',
			},
			{
				path: 'feed',
				loadComponent: () => import('./features/admin/global-feed/global-feed.component').then(m => m.GlobalFeedComponent),
				title: 'Global Activity Feed',
			},
		],
	},
	{
		path: 'super-admin',
		canActivate: [RoleGuard(['SUPER_ADMIN'])],
		loadComponent: () => import('./features/super-admin/super-admin-dashboard/super-admin-dashboard.component').then(m => m.SuperAdminDashboardComponent),
		title: 'Platform Dashboard',
	},
	{
		path: 'super-admin/onboard',
		canActivate: [RoleGuard(['SUPER_ADMIN'])],
		loadComponent: () => import('./features/super-admin/school-onboarding/school-onboarding.component').then(m => m.SchoolOnboardingComponent),
		title: 'New School Onboarding',
	},
	{
		path: 'teacher',
		canActivate: [RoleGuard(['TEACHER'])],
		loadComponent: () => import('./features/teacher/teacher-shell.component').then(m => m.TeacherShellComponent),
		children: [
			{
				path: '',
				redirectTo: 'history',
				pathMatch: 'full',
			},
			{
				path: 'create',
				loadComponent: () => import('./features/teacher/create-activity/create-activity.component').then(m => m.CreateActivityComponent),
				title: 'Create Activity',
			},
			{
				path: 'edit/:activityId',
				loadComponent: () => import('./features/teacher/create-activity/create-activity.component').then(m => m.CreateActivityComponent),
				title: 'Edit Activity',
			},
			{
				path: 'history',
				loadComponent: () => import('./features/teacher/teacher-feed/teacher-feed.component').then(m => m.TeacherFeedComponent),
				title: 'Activity History',
			},
			{
				path: 'logs',
				loadComponent: () => import('./features/teacher/daily-logs/daily-logs.component').then(m => m.DailyLogsComponent),
				title: 'Daily Logs',
			},
			{
				path: 'attendance',
				loadComponent: () => import('./features/teacher/attendance/attendance.component').then(m => m.AttendanceComponent),
				title: 'Attendance',
			},
			{
				path: 'pickup',
				loadComponent: () => import('./features/teacher/pickup/pickup.component').then(m => m.PickupComponent),
				title: 'Secure Pickup',
			},
		],
	},
	{
		path: 'parent',
		canActivate: [RoleGuard(['PARENT'])],
		loadComponent: () => import('./features/parent/parent-shell.component').then(m => m.ParentShellComponent),
		children: [
			{
				path: '',
				redirectTo: 'timeline',
				pathMatch: 'full',
			},
			{
				path: 'timeline',
				loadComponent: () => import('./features/parent/parent-timeline/parent-timeline.component').then(m => m.ParentTimelineComponent),
				title: 'Parent Timeline',
			},
			{
				path: 'fees',
				loadComponent: () => import('./features/parent/fees/parent-fees.component').then(m => m.ParentFeesComponent),
				title: 'Fees & Payments',
			},
			{
				path: 'change-password',
				loadComponent: () => import('./features/parent/change-password/change-password.component').then(m => m.ChangePasswordComponent),
				title: 'Change Password',
			},
			{
				path: 'schedule',
				loadComponent: () => import('./features/parent/school-schedule/school-schedule.component').then(m => m.SchoolScheduleComponent),
				title: 'School Schedule',
			},
		],
	},
];
