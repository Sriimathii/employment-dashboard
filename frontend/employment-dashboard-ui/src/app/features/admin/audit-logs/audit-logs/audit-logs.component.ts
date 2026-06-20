import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpClient } from '@angular/common/http';
 
@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatPaginatorModule, MatProgressBarModule],
  template: `
<div class="page-container">
  <div class="page-header">
    <h1>Audit Logs</h1>
    <p>History of all important system actions</p>
  </div>
  <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>
  <mat-card class="table-card">
    <table mat-table [dataSource]="logs()">
      <ng-container matColumnDef="action">
        <th mat-header-cell *matHeaderCellDef>Action</th>
        <td mat-cell *matCellDef="let l">
          <span class="action-badge" [class.create]="l.action.includes('Created')"
                [class.update]="l.action.includes('Updated')"
                [class.delete]="l.action.includes('Deleted')"
                [class.auth]="l.action.includes('Login')">
            {{ l.action }}
          </span>
        </td>
      </ng-container>
      <ng-container matColumnDef="user">
        <th mat-header-cell *matHeaderCellDef>User</th>
        <td mat-cell *matCellDef="let l">{{ l.user?.username ?? 'System' }}</td>
      </ng-container>
      <ng-container matColumnDef="entity">
        <th mat-header-cell *matHeaderCellDef>Entity</th>
        <td mat-cell *matCellDef="let l">{{ l.entityType }} #{{ l.entityId }}</td>
      </ng-container>
      <ng-container matColumnDef="ip">
        <th mat-header-cell *matHeaderCellDef>IP Address</th>
        <td mat-cell *matCellDef="let l"><code>{{ l.ipAddress ?? '—' }}</code></td>
      </ng-container>
      <ng-container matColumnDef="date">
        <th mat-header-cell *matHeaderCellDef>Date & Time</th>
        <td mat-cell *matCellDef="let l">{{ l.actionDate | date:'medium' }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;" class="table-row"></tr>
    </table>
    <mat-paginator [length]="total()" [pageSize]="20" [pageSizeOptions]="[20,50,100]"
      (page)="onPage($event)" showFirstLastButtons>
    </mat-paginator>
  </mat-card>
</div>`,
styles: [`
  .page-container {
    padding: 1.75rem;
    animation: fadeIn 0.4s ease;
  }

  /* =========================
     PAGE HEADER
  ========================= */

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    margin: 0 0 0.4rem;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    background: linear-gradient(
      135deg,
      #1a237e,
      #3949ab,
      #5c6bc0
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .page-header p {
    margin: 0;
    font-size: 0.95rem;
    color: #64748b;
    font-weight: 500;
  }

  :host-context([data-theme='dark']) .page-header h1 {
    background: linear-gradient(
      135deg,
      #82b1ff,
      #64b5f6,
      #90caf9
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :host-context([data-theme='dark']) .page-header p {
    color: #94a3b8;
  }

  /* =========================
     TABLE CARD
  ========================= */

  .table-card {
    border-radius: 24px !important;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.25);

    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);

    box-shadow:
      0 10px 30px rgba(15,23,42,0.08),
      0 4px 12px rgba(15,23,42,0.04);

    transition: all 0.35s ease;
  }

  .table-card:hover {
    transform: translateY(-3px);
    box-shadow:
      0 20px 40px rgba(15,23,42,0.12),
      0 10px 20px rgba(15,23,42,0.08);
  }

  :host-context([data-theme='dark']) .table-card {
    background: rgba(15,23,42,0.75);
    border: 1px solid rgba(255,255,255,0.08);

    box-shadow:
      0 12px 40px rgba(0,0,0,0.45),
      inset 0 1px 0 rgba(255,255,255,0.05);
  }

  /* =========================
     TABLE ROW
  ========================= */

  .table-row {
    transition:
      background 0.3s ease,
      transform 0.3s ease;
  }

  .table-row:hover {
    background: linear-gradient(
      90deg,
      rgba(99,102,241,0.08),
      rgba(59,130,246,0.04)
    );
  }

  :host-context([data-theme='dark']) .table-row:hover {
    background: rgba(99,102,241,0.12);
  }

  /* =========================
     CODE BLOCK
  ========================= */

  code {
    padding: 4px 10px;
    border-radius: 10px;

    background: rgba(99,102,241,0.08);
    color: #4338ca;

    font-size: 0.82rem;
    font-weight: 600;

    border: 1px solid rgba(99,102,241,0.15);
  }

  :host-context([data-theme='dark']) code {
    background: rgba(99,102,241,0.15);
    color: #a5b4fc;
    border-color: rgba(165,180,252,0.2);
  }

  /* =========================
     PREMIUM ACTION BADGES
  ========================= */

  .action-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    padding: 6px 12px;
    border-radius: 999px;

    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.3px;

    border: 1px solid transparent;

    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
  }

  .action-badge:hover {
    transform: translateY(-2px);
  }

  /* CREATE */

  .action-badge.create {
    background: rgba(16,185,129,0.12);
    color: #059669;
    border-color: rgba(16,185,129,0.25);
    box-shadow: 0 4px 12px rgba(16,185,129,0.15);
  }

  /* UPDATE */

  .action-badge.update {
    background: rgba(59,130,246,0.12);
    color: #2563eb;
    border-color: rgba(59,130,246,0.25);
    box-shadow: 0 4px 12px rgba(59,130,246,0.15);
  }

  /* DELETE */

  .action-badge.delete {
    background: rgba(239,68,68,0.12);
    color: #dc2626;
    border-color: rgba(239,68,68,0.25);
    box-shadow: 0 4px 12px rgba(239,68,68,0.15);
  }

  /* AUTH */

  .action-badge.auth {
    background: rgba(168,85,247,0.12);
    color: #7e22ce;
    border-color: rgba(168,85,247,0.25);
    box-shadow: 0 4px 12px rgba(168,85,247,0.15);
  }

  /* =========================
     DARK MODE BADGES
  ========================= */

  :host-context([data-theme='dark']) .action-badge.create {
    color: #6ee7b7;
  }

  :host-context([data-theme='dark']) .action-badge.update {
    color: #93c5fd;
  }

  :host-context([data-theme='dark']) .action-badge.delete {
    color: #fca5a5;
  }

  :host-context([data-theme='dark']) .action-badge.auth {
    color: #d8b4fe;
  }

  /* =========================
     ANIMATIONS
  ========================= */

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`]
})
export class AuditLogsComponent implements OnInit {
  logs = signal<any[]>([]); total = signal(0); loading = signal(false);
  page = 1; pageSize = 20;
  cols = ['action','user','entity','ip','date'];
  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.http.get<any>(`http://localhost:5095/api/auditlogs?page=${this.page}&pageSize=${this.pageSize}`).subscribe({
      next: r => { this.logs.set(r.data); this.total.set(r.total); },
      complete: () => this.loading.set(false)
    });
  }
  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }
}
