import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
 
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSnackBarModule
  ],
  template: `
<div class="page-container">
  <div class="page-header">
    <h1>Notifications & Announcements</h1>
    <p>Send notifications to all employees and managers</p>
  </div>
 
  <div class="notif-layout">
    <!-- Send Form -->
    <mat-card class="send-card">
      <mat-card-header>
        <mat-card-title><mat-icon>send</mat-icon> Send Notification</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="title" placeholder="e.g. Holiday Announcement">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Message</mat-label>
          <textarea matInput [(ngModel)]="message" rows="5" placeholder="Write your message here..."></textarea>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="send()" [disabled]="!title || !message || sending()">
          <mat-icon>send</mat-icon> {{ sending() ? 'Sending...' : 'Send to All' }}
        </button>
      </mat-card-content>
    </mat-card>
 
    <!-- Recent Notifications -->
    <div class="notif-list">
      <h2>Recent Notifications</h2>
      <mat-card class="notif-item" *ngFor="let n of notifications()">
        <div class="notif-header">
          <mat-icon>notifications</mat-icon>
          <strong>{{ n.title }}</strong>
          <button
      mat-icon-button
      color="warn"
      (click)="deleteNotification(n.notificationId)">
      <mat-icon>delete</mat-icon>
    </button>
          <span class="notif-date">{{ n.createdDate | date:'medium' }}</span>
        </div>
        <p>{{ n.message }}</p>
      </mat-card>
      <div class="empty" *ngIf="notifications().length === 0">
        <mat-icon>notifications_none</mat-icon>
        <p>No notifications sent yet</p>
      </div>
    </div>
  </div>
</div>`,
  styles: [`
    .page-container { padding: 1.5rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: #1a237e; margin: 0 0 0.25rem; }
    .page-header p  { color: #666; margin: 0 0 1.5rem; font-size: 0.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color: #82b1ff; }
    .notif-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .send-card { border-radius: 12px !important; }
    .send-card mat-card-title { display: flex; align-items: center; gap: 0.5rem; }
    .full { width: 100%; margin-bottom: 0.75rem; }
    h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; color: #1a237e; }
    :host-context([data-theme='dark']) h2 { color: #82b1ff; }
    .notif-item { border-radius: 8px !important; margin-bottom: 0.75rem; padding: 1rem; }
    .notif-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .notif-header mat-icon { color: #1565c0; font-size: 20px; }
    .notif-header strong { flex: 1; }
    .notif-date { font-size: 0.75rem; color: #888; }
    .notif-item p { margin: 0; font-size: 0.875rem; color: #555; }
    .empty { text-align: center; padding: 2rem; color: #aaa; }
    .empty mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .spacer {
  flex: 1;
}
    @media (max-width: 900px) { .notif-layout { grid-template-columns: 1fr; } }
  `]
})
export class NotificationsComponent implements OnInit {
  title   = '';  message = ''; sending = signal(false);
  notifications = signal<any[]>([]);
  constructor(private http: HttpClient, private snack: MatSnackBar) {}
  ngOnInit() { this.http.get<any[]>('http://localhost:5095/api/notifications').subscribe(r => this.notifications.set(r)); }
  send() {
    this.sending.set(true);
    this.http.post('http://localhost:5095/api/notifications', { title: this.title, message: this.message, isGlobal: true }).subscribe({
      next: () => {
        this.snack.open('Notification sent!', 'Close', { duration: 3000 });
        this.title = ''; this.message = '';
        this.ngOnInit();
      },
      complete: () => this.sending.set(false)
    });
  }
  deleteNotification(id: number) {

  if (!confirm('Delete this notification?')) {
    return;
  }

  this.http
    .delete(`http://localhost:5095/api/notifications/${id}`)
    .subscribe({
      next: () => {

        this.snack.open(
          'Notification deleted successfully',
          'Close',
          { duration: 3000 }
        );

        this.ngOnInit();
      }
    });
}
}