import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-teacher-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class TeacherShellComponent {}
