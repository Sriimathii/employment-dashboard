import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
 
@Component({
  selector: 'app-notifications-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
<div class="page-container">
  <h1 class="page-title">Notifications</h1>
  <div class="notif-list">
    <mat-card class="notif-item" *ngFor="let n of notifications()">
      <div class="notif-icon-area">
        <mat-icon>notifications</mat-icon>
      </div>
      <div class="notif-body">
        <strong>{{ n.title }}</strong>
        <p>{{ n.message }}</p>
        <span class="notif-time">{{ n.createdDate | date:'medium' }}</span>
      </div>
    </mat-card>
    <div class="empty" *ngIf="notifications().length === 0">
      <mat-icon>notifications_none</mat-icon>
      <p>No notifications</p>
    </div>
  </div>
</div>`,
  styles: [`
    .page-container { padding: 1.5rem; }
    .page-title { font-size: 1.75rem; font-weight: 700; color: #1a237e; margin: 0 0 1.25rem; }
    :host-context([data-theme='dark']) .page-title { color: #82b1ff; }
    .notif-list { display: flex; flex-direction: column; gap: 0.75rem; max-width: 700px; }
    .notif-item { border-radius: 10px !important; display: flex !important; align-items: flex-start; gap: 1rem; padding: 1rem !important; }
    .notif-icon-area { background: #e3f2fd; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .notif-icon-area mat-icon { color: #1565c0; }
    .notif-body strong { display: block; font-size: 0.95rem; margin-bottom: 0.25rem; }
    .notif-body p { margin: 0 0 0.5rem; font-size: 0.875rem; color: #555; }
    .notif-time { font-size: 0.75rem; color: #aaa; }
    .empty { text-align: center; padding: 3rem; color: #aaa; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `]
})
export class NotificationsViewComponent implements OnInit {
  notifications = signal<any[]>([]);
  constructor(private http: HttpClient) {}
  ngOnInit() { this.http.get<any[]>('http://localhost:5095/api/notifications').subscribe(r => this.notifications.set(r)); }
}
 