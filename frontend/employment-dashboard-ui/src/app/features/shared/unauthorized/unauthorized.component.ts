import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
 
@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  template: `
<div class="unauth-container">
  <div class="unauth-content">
    <mat-icon class="unauth-icon">lock</mat-icon>
    <h1>Access Denied</h1>
    <p>You don't have permission to view this page.</p>
    <button mat-raised-button color="primary" routerLink="/">
      <mat-icon>home</mat-icon> Go Home
    </button>
  </div>
</div>`,
  styles: [`
    .unauth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .unauth-content { text-align: center; }
    .unauth-icon { font-size: 80px; width: 80px; height: 80px; color: #e53935; margin-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; color: #1a237e; margin-bottom: 0.5rem; }
    p  { color: #666; margin-bottom: 1.5rem; }
  `]
})
export class UnauthorizedComponent {}
 