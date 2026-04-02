
import { Routes } from '@angular/router';
import { RoleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'login',
		pathMatch: 'full',
	},
	{
		path: 'login',
		component: LoginComponent,
		title: 'Login',
	},
	{
		path: 'feed',
		loadComponent: () => import('./activity-feed').then(m => m.ActivityFeedComponent),
		title: 'Activity Feed',
	},
	{
		path: 'admin',
		canActivate: [RoleGuard(['SCHOOL_ADMIN'])],
		children: [
			{
				path: '',
				loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
				title: 'Admin Dashboard',
			},
			{
				path: 'fees',
				loadComponent: () => import('./features/admin/fees/fees.component').then(m => m.FeesComponent),
				title: 'Fee Management',
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
		],
	},
];
