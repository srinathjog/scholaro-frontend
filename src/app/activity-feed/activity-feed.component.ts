import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Activity {
  id: string;
  teacher_name: string;
  created_at: string;
  title: string;
  description: string;
  media_urls: string[];
}

@Component({
  selector: 'app-activity-feed',
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe]
})
export class ActivityFeedComponent implements OnInit {
  activities: Activity[] = [];
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<Activity[]>('/activities/feed').subscribe({
      next: (data) => {
        this.activities = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
