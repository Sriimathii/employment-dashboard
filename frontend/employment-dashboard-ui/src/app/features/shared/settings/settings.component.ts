import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { SettingsService, FeedbackItem } from '../../../core/services/settings.service';
import { AuthService } from '../../../core/services/auth.service';

type Section = 'appearance' | 'contacts' | 'emails' | 'helpSupport' | 'feedback' | 'feedbackAdmin';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonToggleModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSelectModule, MatDividerModule,
    MatProgressBarModule, MatChipsModule, MatTooltipModule, MatSnackBarModule
  ],
  template: `
<div class="settings-layout">

  <!-- ── Sidebar Nav ─────────────────────────────────── -->
  <aside class="settings-nav">
    <div class="nav-header">
      <mat-icon>tune</mat-icon>
      <span>Settings</span>
    </div>
    <nav>
      <button *ngFor="let item of navItems" class="nav-btn"
              [class.active]="activeSection() === item.id"
              (click)="activeSection.set(item.id)">
        <mat-icon>{{ item.icon }}</mat-icon>
        <span>{{ item.label }}</span>
        <span class="nav-badge" *ngIf="item.id === 'feedbackAdmin' && feedbackCounts().newCount > 0">
          {{ feedbackCounts().newCount }}
        </span>
      </button>
    </nav>
  </aside>

  <!-- ── Main Content ─────────────────────────────────── -->
  <main class="settings-content">

    <!-- ══ 1. APPEARANCE ═══════════════════════════════ -->
    <section *ngIf="activeSection() === 'appearance'">
      <div class="section-header">
        <mat-icon>palette</mat-icon>
        <div><h2>Appearance</h2><p>Choose your preferred display theme</p></div>
      </div>

      <div class="theme-row">
        <div class="theme-card" *ngFor="let t of themes"
             [class.selected]="currentTheme === t.id"
             (click)="setTheme(t.id)">
          <div class="theme-preview" [ngClass]="t.id + '-preview'">
            <div class="tp-sidebar"></div>
            <div class="tp-body">
              <div class="tp-bar"></div>
              <div class="tp-bar short"></div>
            </div>
          </div>
          <div class="theme-meta">
            <mat-icon>{{ t.icon }}</mat-icon>
            <span>{{ t.label }}</span>
            <mat-icon class="check" *ngIf="currentTheme === t.id">check_circle</mat-icon>
          </div>
        </div>
      </div>

      <div class="theme-hint">
        <mat-icon>info</mat-icon>
        <span *ngIf="currentTheme === 'light'">Light theme is active across the entire application.</span>
        <span *ngIf="currentTheme === 'dark'">Dark theme is active across the entire application.</span>
        <span *ngIf="currentTheme === 'system'">Automatically follows your device's system preference.</span>
      </div>
    </section>

    <!-- ══ 2. EMERGENCY CONTACTS ════════════════════════ -->
    <section *ngIf="activeSection() === 'contacts'">
      <div class="section-header">
        <mat-icon>emergency</mat-icon>
        <div><h2>Emergency Contacts & Helplines</h2>
             <p>Important contact numbers for employees</p></div>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>

      <!-- View mode (all users) -->
      <div class="contact-grid" *ngIf="!isAdmin">
        <div class="contact-card" *ngFor="let c of contactCards">
          <div class="cc-icon" [style.background]="c.color + '20'">
            <mat-icon [style.color]="c.color">{{ c.icon }}</mat-icon>
          </div>
          <div class="cc-info">
            <span class="cc-label">{{ c.label }}</span>
            <a class="cc-value" [href]="'tel:' + contactData[c.key]">
              {{ contactData[c.key] || 'Not configured' }}
            </a>
          </div>
          <mat-icon class="cc-call" [style.color]="c.color">call</mat-icon>
        </div>
      </div>

      <!-- Edit mode (admin) -->
      <div class="edit-grid" *ngIf="isAdmin">
        <div class="edit-row" *ngFor="let c of contactCards">
          <div class="edit-icon" [style.background]="c.color + '15'">
            <mat-icon [style.color]="c.color">{{ c.icon }}</mat-icon>
          </div>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>{{ c.label }}</mat-label>
            <input matInput [(ngModel)]="contactData[c.key]" [placeholder]="c.placeholder">
            <mat-icon matPrefix>phone</mat-icon>
          </mat-form-field>
        </div>
        <button mat-raised-button color="primary" (click)="saveContacts()" [disabled]="saving()">
          <mat-icon>save</mat-icon> {{ saving() ? 'Saving...' : 'Save Contact Numbers' }}
        </button>
      </div>
    </section>

    <!-- ══ 3. COMPANY EMAILS ═════════════════════════════ -->
    <section *ngIf="activeSection() === 'emails'">
      <div class="section-header">
        <mat-icon>email</mat-icon>
        <div><h2>Official Company Emails</h2>
             <p>Important email addresses for the organisation</p></div>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>

      <!-- View mode -->
      <div class="contact-grid" *ngIf="!isAdmin">
        <div class="contact-card" *ngFor="let e of emailCards">
          <div class="cc-icon" [style.background]="e.color + '20'">
            <mat-icon [style.color]="e.color">{{ e.icon }}</mat-icon>
          </div>
          <div class="cc-info">
            <span class="cc-label">{{ e.label }}</span>
            <a class="cc-value" [href]="'mailto:' + emailData[e.key]">
              {{ emailData[e.key] || 'Not configured' }}
            </a>
          </div>
          <mat-icon class="cc-call" [style.color]="e.color">open_in_new</mat-icon>
        </div>
      </div>

      <!-- Edit mode -->
      <div class="edit-grid" *ngIf="isAdmin">
        <div class="edit-row" *ngFor="let e of emailCards">
          <div class="edit-icon" [style.background]="e.color + '15'">
            <mat-icon [style.color]="e.color">{{ e.icon }}</mat-icon>
          </div>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>{{ e.label }}</mat-label>
            <input matInput type="email" [(ngModel)]="emailData[e.key]" [placeholder]="e.placeholder">
            <mat-icon matPrefix>alternate_email</mat-icon>
          </mat-form-field>
        </div>
        <button mat-raised-button color="primary" (click)="saveEmails()" [disabled]="saving()">
          <mat-icon>save</mat-icon> {{ saving() ? 'Saving...' : 'Save Email Addresses' }}
        </button>
      </div>
    </section>

    <!-- ══ 4. HELP & SUPPORT ══════════════════════════════ -->
    <section *ngIf="activeSection() === 'helpSupport'">
      <div class="section-header">
        <mat-icon>help_center</mat-icon>
        <div><h2>Help & Support</h2>
             <p>Get assistance when something isn't working</p></div>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>

      <div class="help-banner">
        <mat-icon>support_agent</mat-icon>
        <div>
          <strong>Need help with the application?</strong>
          <p>If any feature is not working properly, our support team is here to help. Reach out using the contact information below.</p>
        </div>
      </div>

      <div class="support-cards">
        <a class="support-card" [href]="'mailto:' + supportData['email']">
          <div class="sc-icon" style="background:#e3f2fd">
            <mat-icon style="color:#1565c0">email</mat-icon>
          </div>
          <div class="sc-info">
            <span class="sc-label">Support Email</span>
            <span class="sc-value">{{ supportData['email'] || 'Not configured' }}</span>
          </div>
        </a>

        <a class="support-card" [href]="'tel:' + supportData['phone']">
          <div class="sc-icon" style="background:#e8f5e9">
            <mat-icon style="color:#2e7d32">phone</mat-icon>
          </div>
          <div class="sc-info">
            <span class="sc-label">Support Phone</span>
            <span class="sc-value">{{ supportData['phone'] || 'Not configured' }}</span>
          </div>
        </a>

        <a class="support-card" [href]="'tel:' + supportData['helpline']">
          <div class="sc-icon" style="background:#fff3e0">
            <mat-icon style="color:#e65100">emergency</mat-icon>
          </div>
          <div class="sc-info">
            <span class="sc-label">Office Helpline</span>
            <span class="sc-value">{{ supportData['helpline'] || 'Not configured' }}</span>
          </div>
        </a>
      </div>

      <div class="support-hours" *ngIf="supportData['hours']">
        <mat-icon>schedule</mat-icon>
        <span>Support Hours: <strong>{{ supportData['hours'] }}</strong></span>
      </div>

      <!-- Admin edit support info -->
      <div class="edit-grid" *ngIf="isAdmin" style="margin-top:2rem">
        <div class="section-divider">
          <mat-icon>edit</mat-icon> Edit Support Information
        </div>
        <div class="edit-row">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Support Email</mat-label>
            <input matInput type="email" [(ngModel)]="supportData['email']">
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>
        </div>
        <div class="edit-row">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Support Phone</mat-label>
            <input matInput [(ngModel)]="supportData['phone']">
            <mat-icon matPrefix>phone</mat-icon>
          </mat-form-field>
        </div>
        <div class="edit-row">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Office Helpline</mat-label>
            <input matInput [(ngModel)]="supportData['helpline']">
            <mat-icon matPrefix>emergency</mat-icon>
          </mat-form-field>
        </div>
        <div class="edit-row">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Support Hours</mat-label>
            <input matInput [(ngModel)]="supportData['hours']" placeholder="e.g. Monday – Friday, 9AM – 6PM">
            <mat-icon matPrefix>schedule</mat-icon>
          </mat-form-field>
        </div>
        <button mat-raised-button color="primary" (click)="saveSupport()" [disabled]="saving()">
          <mat-icon>save</mat-icon> {{ saving() ? 'Saving...' : 'Save Support Info' }}
        </button>
      </div>

      <mat-divider style="margin: 2rem 0"></mat-divider>

      <div class="feedback-cta">
        <mat-icon>feedback</mat-icon>
        <div>
          <strong>Have a suggestion or found a bug?</strong>
          <p>Use the Feedback section to report issues or share improvement ideas.</p>
        </div>
        <button mat-raised-button color="primary" (click)="activeSection.set('feedback')">
          <mat-icon>rate_review</mat-icon> Submit Feedback
        </button>
      </div>
    </section>

    <!-- ══ 5. FEEDBACK FORM ══════════════════════════════ -->
    <section *ngIf="activeSection() === 'feedback'">
      <div class="section-header">
        <mat-icon>rate_review</mat-icon>
        <div><h2>Submit Feedback</h2>
             <p>Share suggestions, report issues, or request new features</p></div>
      </div>

      <!-- Category chips -->
      <div class="category-row">
        <button *ngFor="let cat of categories" class="cat-chip"
                [class.selected]="feedbackForm.category === cat.value"
                [style.--cat-color]="cat.color"
                (click)="feedbackForm.category = cat.value">
          <mat-icon>{{ cat.icon }}</mat-icon>
          {{ cat.label }}
        </button>
      </div>

      <div class="form-stack">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Feedback Title *</mat-label>
          <input matInput [(ngModel)]="feedbackForm.title" placeholder="Briefly describe your feedback">
          <mat-hint align="end">{{ feedbackForm.title.length }}/100</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Description *</mat-label>
          <textarea matInput [(ngModel)]="feedbackForm.description"
                    rows="5" placeholder="Describe in detail..."></textarea>
          <mat-hint>Be specific — it helps us action your feedback faster</mat-hint>
        </mat-form-field>

        <div class="submit-row">
          <div class="submit-meta">
            <mat-icon>schedule</mat-icon>
            <span>Will be submitted at {{ now | date:'medium' }}</span>
          </div>
          <button mat-raised-button color="primary" (click)="submitFeedback()"
                  [disabled]="!feedbackForm.title || !feedbackForm.description || submitting()">
            <mat-icon>send</mat-icon>
            {{ submitting() ? 'Submitting...' : 'Submit Feedback' }}
          </button>
        </div>
      </div>

      <!-- My submitted feedback -->
      <mat-divider style="margin:2rem 0"></mat-divider>
      <h3 class="my-feedback-title">My Submitted Feedback</h3>
      <mat-progress-bar mode="indeterminate" *ngIf="feedbackLoading()"></mat-progress-bar>
      <div class="feedback-list">
        <div class="feedback-item" *ngFor="let f of myFeedback()">
          <div class="fi-header">
            <span class="fi-category" [style.background]="getCatColor(f.category) + '20'"
                  [style.color]="getCatColor(f.category)">
              <mat-icon>{{ getCatIcon(f.category) }}</mat-icon> {{ f.category }}
            </span>
            <span class="fi-status" [ngClass]="'status-' + f.status.toLowerCase()">
              {{ f.status }}
            </span>
          </div>
          <h4 class="fi-title">{{ f.title }}</h4>
          <p class="fi-desc">{{ f.description }}</p>
          <div class="fi-reply" *ngIf="f.adminReply">
            <mat-icon>reply</mat-icon>
            <span><strong>Admin reply:</strong> {{ f.adminReply }}</span>
          </div>
          <div class="fi-footer">
            <mat-icon>schedule</mat-icon>
            <span>{{ f.submittedAt | date:'medium' }}</span>
          </div>
        </div>
        <div class="empty-state" *ngIf="!feedbackLoading() && myFeedback().length === 0">
          <mat-icon>inbox</mat-icon>
          <p>No feedback submitted yet</p>
        </div>
      </div>
    </section>

    <!-- ══ 6. ADMIN FEEDBACK PANEL ═══════════════════════ -->
    <section *ngIf="activeSection() === 'feedbackAdmin' && isAdmin">
      <div class="section-header">
        <mat-icon>admin_panel_settings</mat-icon>
        <div><h2>Feedback Management</h2>
             <p>Review and respond to employee feedback</p></div>
      </div>

      <!-- Summary chips -->
      <div class="summary-chips">
        <div class="sum-chip new"      (click)="feedbackFilter.set('New')">
          <span class="chip-val">{{ feedbackCounts().newCount }}</span>
          <span class="chip-lbl">New</span>
        </div>
        <div class="sum-chip reviewed" (click)="feedbackFilter.set('Reviewed')">
          <span class="chip-val">{{ feedbackCounts().reviewedCount }}</span>
          <span class="chip-lbl">Reviewed</span>
        </div>
        <div class="sum-chip resolved" (click)="feedbackFilter.set('Resolved')">
          <span class="chip-val">{{ feedbackCounts().resolvedCount }}</span>
          <span class="chip-lbl">Resolved</span>
        </div>
        <div class="sum-chip all" (click)="feedbackFilter.set('')">
          <span class="chip-val">{{ feedbackCounts().total }}</span>
          <span class="chip-lbl">All</span>
        </div>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="feedbackLoading()"></mat-progress-bar>

      <!-- Category filter -->
      <div class="filter-row" style="margin-bottom:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
        <button *ngFor="let cat of categoryFilters" class="cat-chip small"
                [class.selected]="feedbackCatFilter() === cat"
                (click)="feedbackCatFilter.set(cat || '')">
          {{ cat || 'All Categories' }}
        </button>
      </div>

      <div class="feedback-list admin">
        <div class="feedback-item admin-item" *ngFor="let f of filteredAdminFeedback()">
          <div class="fi-header">
            <span class="fi-category" [style.background]="getCatColor(f.category) + '20'"
                  [style.color]="getCatColor(f.category)">
              <mat-icon>{{ getCatIcon(f.category) }}</mat-icon> {{ f.category }}
            </span>
            <span class="fi-status" [ngClass]="'status-' + f.status.toLowerCase()">
              {{ f.status }}
            </span>
            <span class="fi-user">
              <mat-icon>person</mat-icon> {{ f.submittedBy }}
              <span class="fi-role">{{ f.role }}</span>
            </span>
          </div>
          <h4 class="fi-title">{{ f.title }}</h4>
          <p class="fi-desc">{{ f.description }}</p>

          <!-- Admin reply form -->
          <div class="admin-reply-box" *ngIf="replyingTo() === f.feedbackId">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Admin Reply</mat-label>
              <textarea matInput [(ngModel)]="replyText" rows="3"></textarea>
            </mat-form-field>
            <div style="display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap">
              <mat-form-field appearance="outline" style="flex:1;min-width:150px">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="replyStatus">
                  <mat-option value="New">New</mat-option>
                  <mat-option value="Reviewed">Reviewed</mat-option>
                  <mat-option value="Resolved">Resolved</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="submitReply(f.feedbackId)" [disabled]="saving()">
                <mat-icon>send</mat-icon> {{ saving() ? 'Saving...' : 'Send Reply' }}
              </button>
              <button mat-stroked-button (click)="replyingTo.set(null)">Cancel</button>
            </div>
          </div>

          <div class="fi-reply" *ngIf="f.adminReply && replyingTo() !== f.feedbackId">
            <mat-icon>reply</mat-icon>
            <span><strong>Your reply:</strong> {{ f.adminReply }}</span>
          </div>

          <div class="fi-footer">
            <mat-icon>schedule</mat-icon>
            <span>{{ f.submittedAt | date:'medium' }}</span>
            <button mat-stroked-button class="reply-btn" (click)="startReply(f)">
              <mat-icon>reply</mat-icon> {{ f.adminReply ? 'Update Reply' : 'Reply' }}
            </button>
          </div>
        </div>

        <div class="empty-state" *ngIf="!feedbackLoading() && filteredAdminFeedback().length === 0">
          <mat-icon>inbox</mat-icon>
          <p>No feedback found</p>
        </div>
      </div>
    </section>

  </main>
</div>`,
  styles: [`
    /* ── Layout ─────────────────────────────────────────── */
    .settings-layout {
      display: grid; grid-template-columns: 240px 1fr; min-height: calc(100vh - 64px);
    }
    @media (max-width: 768px) { .settings-layout { grid-template-columns: 1fr; } }

    /* ── Sidebar ─────────────────────────────────────────── */
    .settings-nav {
      background: #f8f9ff; border-right: 1px solid #e8eaf6;
      padding: 1.5rem 0; display: flex; flex-direction: column; gap: 2px;
    }
    :host-context([data-theme='dark']) .settings-nav { background: #1a1a2e; border-color: #2a2a4a; }
    .nav-header {
      display: flex; align-items: center; gap: .75rem;
      padding: .5rem 1.25rem 1.25rem; font-size: 1rem; font-weight: 700; color: #1a237e;
      border-bottom: 1px solid #e8eaf6; margin-bottom: .5rem;
    }
    :host-context([data-theme='dark']) .nav-header { color: #82b1ff; border-color: #2a2a4a; }
    .nav-header mat-icon { color: #1565c0; }
    .nav-btn {
      display: flex; align-items: center; gap: .75rem;
      padding: .7rem 1.25rem; background: none; border: none; width: 100%;
      font-size: .875rem; color: #555; cursor: pointer; border-radius: 0;
      border-right: 3px solid transparent; transition: all .2s; text-align: left;
    }
    :host-context([data-theme='dark']) .nav-btn { color: rgba(255,255,255,.65); }
    .nav-btn mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .nav-btn:hover { background: rgba(26,35,126,.06); color: #1a237e; }
    .nav-btn.active { background: rgba(26,35,126,.1); color: #1a237e; border-right-color: #1a237e; font-weight: 600; }
    :host-context([data-theme='dark']) .nav-btn.active { color: #82b1ff; border-right-color: #82b1ff; background: rgba(130,177,255,.1); }
    .nav-badge { margin-left: auto; background: #f44336; color: white; border-radius: 10px; padding: 1px 7px; font-size: .7rem; font-weight: 700; }

    /* ── Content ─────────────────────────────────────────── */
    .settings-content { padding: 2rem; max-width: 780px; }
    @media (max-width: 768px) { .settings-content { padding: 1rem; } }

    .section-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.75rem; }
    .section-header mat-icon { font-size: 32px; width: 32px; height: 32px; color: #1565c0; margin-top: 2px; }
    .section-header h2 { font-size: 1.4rem; font-weight: 700; color: #1a237e; margin: 0 0 .25rem; }
    .section-header p  { color: #777; margin: 0; font-size: .875rem; }
    :host-context([data-theme='dark']) .section-header h2 { color: #82b1ff; }
    :host-context([data-theme='dark']) .section-header p  { color: rgba(255,255,255,.55); }

    /* ── Theme ────────────────────────────────────────────── */
    .theme-row { display: flex; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .theme-card {
      flex: 1; min-width: 140px; border-radius: 12px; border: 2px solid #e0e0e0;
      overflow: hidden; cursor: pointer; transition: all .2s;
    }
    .theme-card:hover { border-color: #5c6bc0; transform: translateY(-2px); }
    .theme-card.selected { border-color: #1a237e; box-shadow: 0 0 0 3px rgba(26,35,126,.15); }
    .theme-preview { height: 80px; display: flex; }
    .tp-sidebar { width: 30px; flex-shrink: 0; }
    .tp-body { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
    .tp-bar { height: 7px; border-radius: 3px; width: 70%; }
    .tp-bar.short { width: 45%; }
    .light-preview .tp-sidebar { background: #1a237e; }
    .light-preview .tp-body { background: #f5f7fa; }
    .light-preview .tp-bar { background: #dde1f0; }
    .dark-preview .tp-sidebar { background: #12122a; }
    .dark-preview .tp-body { background: #0f0f1a; }
    .dark-preview .tp-bar { background: #2a2a4a; }
    .system-preview .tp-sidebar { background: linear-gradient(180deg, #1a237e 50%, #12122a 50%); }
    .system-preview .tp-body { background: linear-gradient(180deg, #f5f7fa 50%, #0f0f1a 50%); }
    .system-preview .tp-bar { background: linear-gradient(180deg, #dde1f0 50%, #2a2a4a 50%); }
    .theme-meta { display: flex; align-items: center; gap: .5rem; padding: .6rem .75rem; font-size: .85rem; font-weight: 600; }
    .theme-meta .check { color: #2e7d32; margin-left: auto; font-size: 18px; }
    .theme-hint { display: flex; align-items: center; gap: .4rem; color: #888; font-size: .85rem; }
    .theme-hint mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ── Contact & Email Cards ────────────────────────────── */
    .contact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .contact-card {
      display: flex; align-items: center; gap: 1rem;
      background: white; border-radius: 12px; padding: 1rem 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,.06); border: 1px solid #f0f0f0; cursor: pointer;
      transition: all .2s;
    }
    :host-context([data-theme='dark']) .contact-card { background: #1e1e35; border-color: #2a2a4a; }
    .contact-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-1px); }
    .cc-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cc-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .cc-label { font-size: .75rem; color: #888; font-weight: 500; }
    .cc-value { font-size: .95rem; font-weight: 700; color: #1a237e; text-decoration: none; }
    :host-context([data-theme='dark']) .cc-value { color: #82b1ff; }
    .cc-call { color: #ccc; font-size: 20px; flex-shrink: 0; }

    /* ── Edit grids ───────────────────────────────────────── */
    .edit-grid { display: flex; flex-direction: column; gap: .75rem; }
    .edit-row { display: flex; align-items: center; gap: .75rem; }
    .edit-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .section-divider { display: flex; align-items: center; gap: .5rem; font-weight: 600; color: #1565c0; font-size: .9rem; padding: .5rem 0; border-top: 1px solid #e8eaf6; margin-top: .5rem; }
    .section-divider mat-icon { font-size: 18px; }

    /* ── Help & Support ───────────────────────────────────── */
    .help-banner {
      display: flex; align-items: flex-start; gap: 1rem;
      background: linear-gradient(135deg, #e3f2fd, #f3e5f5);
      border-radius: 14px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;
    }
    .help-banner mat-icon { font-size: 36px; width: 36px; height: 36px; color: #1565c0; flex-shrink: 0; }
    .help-banner strong { font-size: 1rem; font-weight: 700; color: #1a237e; }
    .help-banner p { color: #555; font-size: .875rem; margin: .4rem 0 0; }
    :host-context([data-theme='dark']) .help-banner { background: rgba(130,177,255,.12); }
    :host-context([data-theme='dark']) .help-banner strong { color: #82b1ff; }

    .support-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .support-card {
      display: flex; align-items: center; gap: .75rem;
      background: white; border-radius: 12px; padding: .9rem 1rem;
      text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,.06); border: 1px solid #f0f0f0; transition: all .2s;
    }
    :host-context([data-theme='dark']) .support-card { background: #1e1e35; border-color: #2a2a4a; }
    .support-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
    .sc-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .sc-info { display: flex; flex-direction: column; gap: 2px; }
    .sc-label { font-size: .7rem; color: #888; }
    .sc-value { font-size: .875rem; font-weight: 600; color: #333; }
    :host-context([data-theme='dark']) .sc-value { color: rgba(255,255,255,.85); }
    .support-hours { display: flex; align-items: center; gap: .5rem; color: #666; font-size: .85rem; margin-bottom: .5rem; }
    .support-hours mat-icon { font-size: 18px; color: #1565c0; }
    .feedback-cta { display: flex; align-items: center; gap: 1rem; background: #f8f9ff; border-radius: 12px; padding: 1.25rem; flex-wrap: wrap; }
    .feedback-cta mat-icon { font-size: 32px; width: 32px; height: 32px; color: #1565c0; }
    .feedback-cta strong { font-size: .95rem; font-weight: 700; color: #1a237e; }
    .feedback-cta p { color: #666; font-size: .825rem; margin: .25rem 0 0; }
    :host-context([data-theme='dark']) .feedback-cta { background: rgba(130,177,255,.08); }

    /* ── Feedback form ────────────────────────────────────── */
    .category-row { display: flex; gap: .6rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .cat-chip {
      display: flex; align-items: center; gap: .4rem; padding: .45rem 1rem;
      border-radius: 20px; border: 2px solid #e0e0e0; background: white;
      font-size: .825rem; font-weight: 600; cursor: pointer; transition: all .2s; color: #555;
    }
    .cat-chip:hover { border-color: #5c6bc0; }
    .cat-chip.selected { background: var(--cat-color, #1a237e); color: white; border-color: var(--cat-color, #1a237e); }
    .cat-chip.small { font-size: .75rem; padding: .3rem .75rem; }
    .cat-chip mat-icon { font-size: 15px; width: 15px; height: 15px; }
    :host-context([data-theme='dark']) .cat-chip { background: #1e1e35; border-color: #2a2a4a; color: rgba(255,255,255,.7); }

    .form-stack { display: flex; flex-direction: column; gap: .75rem; }
    .full { width: 100%; }
    .submit-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .submit-meta { display: flex; align-items: center; gap: .4rem; color: #888; font-size: .8rem; }
    .submit-meta mat-icon { font-size: 16px; }

    /* ── Feedback list ────────────────────────────────────── */
    .my-feedback-title { font-size: 1rem; font-weight: 700; color: #1a237e; margin: 0 0 1rem; }
    :host-context([data-theme='dark']) .my-feedback-title { color: #82b1ff; }
    .feedback-list { display: flex; flex-direction: column; gap: .75rem; }
    .feedback-item {
      background: white; border-radius: 12px; padding: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,.06); border: 1px solid #f0f0f0;
    }
    :host-context([data-theme='dark']) .feedback-item { background: #1e1e35; border-color: #2a2a4a; }
    .admin-item { border-left: 4px solid #1a237e; }

    .fi-header { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; flex-wrap: wrap; }
    .fi-category { display: flex; align-items: center; gap: .3rem; padding: 3px 10px; border-radius: 12px; font-size: .78rem; font-weight: 600; }
    .fi-category mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .fi-status { padding: 3px 10px; border-radius: 12px; font-size: .78rem; font-weight: 600; }
    .status-new      { background: #fff8e1; color: #f57f17; }
    .status-reviewed { background: #e3f2fd; color: #1565c0; }
    .status-resolved { background: #e8f5e9; color: #2e7d32; }
    .fi-user { display: flex; align-items: center; gap: .3rem; font-size: .8rem; color: #888; margin-left: auto; }
    .fi-user mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .fi-role { background: #e8eaf6; color: #3949ab; padding: 1px 7px; border-radius: 8px; font-size: .72rem; }
    .fi-title { font-size: .95rem; font-weight: 700; margin: 0 0 .4rem; color: #222; }
    :host-context([data-theme='dark']) .fi-title { color: rgba(255,255,255,.9); }
    .fi-desc { font-size: .85rem; color: #555; margin: 0 0 .75rem; line-height: 1.5; }
    :host-context([data-theme='dark']) .fi-desc { color: rgba(255,255,255,.55); }
    .fi-reply { display: flex; align-items: flex-start; gap: .4rem; background: #e8f5e9; border-radius: 8px; padding: .6rem .9rem; font-size: .83rem; color: #2e7d32; margin-bottom: .5rem; }
    .fi-reply mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    .fi-footer { display: flex; align-items: center; gap: .4rem; color: #aaa; font-size: .78rem; }
    .fi-footer mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .reply-btn { margin-left: auto; font-size: .78rem !important; height: 28px !important; padding: 0 8px !important; }
    .reply-btn mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
    .admin-reply-box { background: #f8f9ff; border-radius: 10px; padding: 1rem; margin: .75rem 0; }
    :host-context([data-theme='dark']) .admin-reply-box { background: rgba(130,177,255,.08); }

    /* ── Summary chips (admin feedback) ──────────────────── */
    .summary-chips { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .sum-chip {
      flex: 1; min-width: 90px; border-radius: 12px; padding: .9rem 1rem;
      display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform .2s;
    }
    .sum-chip:hover { transform: translateY(-2px); }
    .chip-val { font-size: 1.75rem; font-weight: 800; }
    .chip-lbl { font-size: .75rem; font-weight: 600; margin-top: 2px; }
    .sum-chip.new      { background: #fff8e1; color: #f57f17; }
    .sum-chip.reviewed { background: #e3f2fd; color: #1565c0; }
    .sum-chip.resolved { background: #e8f5e9; color: #2e7d32; }
    .sum-chip.all      { background: #f3e5f5; color: #7b1fa2; }

    /* ── Empty state ──────────────────────────────────────── */
    .empty-state { text-align: center; padding: 2.5rem; color: #bbb; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; display: block; margin: 0 auto .75rem; }
    .empty-state p { font-size: .95rem; margin: 0; }
  `]
})
export class SettingsComponent implements OnInit {
  activeSection = signal<Section>('appearance');
  categoryFilters: string[] = [];
  loading       = signal(false);
  saving        = signal(false);
  submitting    = signal(false);
  feedbackLoading = signal(false);
  feedbackFilter  = signal('');
  feedbackCatFilter = signal('');
  replyingTo    = signal<number | null>(null);
  replyText     = '';
  replyStatus   = 'Reviewed';
  now           = new Date();

  myFeedback     = signal<FeedbackItem[]>([]);
  allFeedback    = signal<FeedbackItem[]>([]);

  currentTheme: Theme;

  // Data models
  contactData: Record<string, string> = {};
  emailData:   Record<string, string> = {};
  supportData: Record<string, string> = {};
  companyData: Record<string, string> = {};

  feedbackForm = { title: '', description: '', category: 'General Feedback' };

  themes = [
    { id: 'light' as Theme, label: 'Light',  icon: 'light_mode' },
    { id: 'dark'  as Theme, label: 'Dark',   icon: 'dark_mode' },
    { id: 'system'as Theme, label: 'System', icon: 'brightness_auto' }
  ];

  categories = [
    { value: 'Suggestion',       label: 'Suggestion',       icon: 'lightbulb',  color: '#1565c0' },
    { value: 'Complaint',        label: 'Complaint',        icon: 'report',     color: '#c62828' },
    { value: 'Feature Request',  label: 'Feature Request',  icon: 'add_circle', color: '#2e7d32' },
    { value: 'General Feedback', label: 'General',          icon: 'chat',       color: '#7b1fa2' }
  ];

  contactCards = [
    { key: 'hr_helpline',      label: 'HR Helpline',      icon: 'support_agent', color: '#1565c0', placeholder: '+91 00000 00000' },
    { key: 'office_reception', label: 'Office Reception', icon: 'business',      color: '#2e7d32', placeholder: '+91 00000 00000' },
    { key: 'it_support',       label: 'IT Support',       icon: 'computer',      color: '#7b1fa2', placeholder: '+91 00000 00000' },
    { key: 'emergency',        label: 'Emergency',        icon: 'emergency',     color: '#c62828', placeholder: '+91 00000 00000' }
  ];

  emailCards = [
    { key: 'hr',      label: 'HR Email',      icon: 'people',       color: '#1565c0', placeholder: 'hr@company.com' },
    { key: 'support', label: 'Support Email', icon: 'support',      color: '#2e7d32', placeholder: 'support@company.com' },
    { key: 'admin',   label: 'Admin Email',   icon: 'admin_panel_settings', color: '#7b1fa2', placeholder: 'admin@company.com' },
    { key: 'general', label: 'General Email', icon: 'mail',         color: '#e65100', placeholder: 'info@company.com' }
  ];

  get isAdmin(): boolean { return this.auth.getRole() === 'Admin'; }

  get navItems() {
    const base = [
      { id: 'appearance'  as Section, label: 'Appearance',          icon: 'palette' },
      { id: 'contacts'    as Section, label: 'Emergency Contacts',  icon: 'emergency' },
      { id: 'emails'      as Section, label: 'Company Emails',      icon: 'email' },
      { id: 'helpSupport' as Section, label: 'Help & Support',      icon: 'help_center' },
      { id: 'feedback'    as Section, label: 'Feedback',            icon: 'rate_review' }
    ];
    if (this.isAdmin)
      base.push({ id: 'feedbackAdmin' as Section, label: 'Manage Feedback', icon: 'admin_panel_settings' });
    return base;
  }

  feedbackCounts = computed(() => {
    const all = this.allFeedback();
    return {
      newCount:      all.filter(f => f.status === 'New').length,
      reviewedCount: all.filter(f => f.status === 'Reviewed').length,
      resolvedCount: all.filter(f => f.status === 'Resolved').length,
      total:         all.length
    };
  });

  filteredAdminFeedback = computed(() => {
    let list = this.allFeedback();
    if (this.feedbackFilter())    list = list.filter(f => f.status   === this.feedbackFilter());
    if (this.feedbackCatFilter()) list = list.filter(f => f.category === this.feedbackCatFilter());
    return list;
  });

  constructor(
    public  themeSvc:    ThemeService,
    private settingsSvc: SettingsService,
    private auth:        AuthService,
    private snack:       MatSnackBar
  ) {
    this.currentTheme = themeSvc.theme;
  }

  ngOnInit() {
    this.loadSettings();
    this.loadMyFeedback();
    if (this.isAdmin) this.loadAllFeedback();
  }

  loadSettings() {
    this.loading.set(true);
    this.settingsSvc.getAll().subscribe({
      next: d => {
        this.contactData = { ...this.defaultContacts(), ...d.contacts };
        this.emailData   = { ...this.defaultEmails(),   ...d.emails };
        this.supportData = { ...this.defaultSupport(),  ...d.support };
        this.companyData = { ...d.company };
      },
      complete: () => this.loading.set(false),
      error:    () => {
        // Use defaults if settings not loaded yet
        this.contactData = this.defaultContacts();
        this.emailData   = this.defaultEmails();
        this.supportData = this.defaultSupport();
        this.loading.set(false);
      }
    });
  }

  loadMyFeedback() {
    this.feedbackLoading.set(true);
    this.settingsSvc.getFeedback().subscribe({
      next:     f => this.myFeedback.set(f),
      complete: () => this.feedbackLoading.set(false),
      error:    () => this.feedbackLoading.set(false)
    });
  }

  loadAllFeedback() {
    this.settingsSvc.getFeedback().subscribe({
      next: f => this.allFeedback.set(f)
    });
  }

  setTheme(t: Theme) {
    this.currentTheme = t;
    this.themeSvc.setTheme(t);
    const labels: Record<Theme, string> = { light: 'Light theme applied', dark: 'Dark theme applied', system: 'Following system theme' };
    this.snack.open(labels[t], '×', { duration: 2000 });
  }

  saveContacts() {
    this.saving.set(true);
    this.settingsSvc.saveContacts(this.contactData).subscribe({
      next:     r => this.snack.open(r.message, '×', { duration: 3000 }),
      error:    () => this.snack.open('Save failed.', '×', { duration: 3000 }),
      complete: () => this.saving.set(false)
    });
  }

  saveEmails() {
    this.saving.set(true);
    this.settingsSvc.saveEmails(this.emailData).subscribe({
      next:     r => this.snack.open(r.message, '×', { duration: 3000 }),
      error:    () => this.snack.open('Save failed.', '×', { duration: 3000 }),
      complete: () => this.saving.set(false)
    });
  }

  saveSupport() {
    this.saving.set(true);
    this.settingsSvc.saveSupport(this.supportData).subscribe({
      next:     r => this.snack.open(r.message, '×', { duration: 3000 }),
      error:    () => this.snack.open('Save failed.', '×', { duration: 3000 }),
      complete: () => this.saving.set(false)
    });
  }

  submitFeedback() {
    if (!this.feedbackForm.title || !this.feedbackForm.description) return;
    this.submitting.set(true);
    this.settingsSvc.submitFeedback(this.feedbackForm).subscribe({
      next: () => {
        this.snack.open('Feedback submitted! Thank you.', '×', { duration: 4000 });
        this.feedbackForm = { title: '', description: '', category: 'General Feedback' };
        this.loadMyFeedback();
        if (this.isAdmin) this.loadAllFeedback();
      },
      error:    () => this.snack.open('Submission failed.', '×', { duration: 3000 }),
      complete: () => this.submitting.set(false)
    });
  }

  startReply(f: FeedbackItem) {
    this.replyingTo.set(f.feedbackId);
    this.replyText   = f.adminReply ?? '';
    this.replyStatus = f.status;
  }

  submitReply(id: number) {
    this.saving.set(true);
    this.settingsSvc.reviewFeedback(id, { status: this.replyStatus, adminReply: this.replyText }).subscribe({
      next: () => {
        this.snack.open('Feedback updated.', '×', { duration: 3000 });
        this.replyingTo.set(null);
        this.loadAllFeedback();
      },
      error:    () => this.snack.open('Update failed.', '×', { duration: 3000 }),
      complete: () => this.saving.set(false)
    });
  }

  getCatColor(cat: string): string {
    const m: Record<string, string> = {
      'Suggestion': '#1565c0', 'Complaint': '#c62828',
      'Feature Request': '#2e7d32', 'General Feedback': '#7b1fa2'
    };
    return m[cat] ?? '#1565c0';
  }
  getCatIcon(cat: string): string {
    const m: Record<string, string> = {
      'Suggestion': 'lightbulb', 'Complaint': 'report',
      'Feature Request': 'add_circle', 'General Feedback': 'chat'
    };
    return m[cat] ?? 'chat';
  }

  private defaultContacts = () => ({ hr_helpline: '', office_reception: '', it_support: '', emergency: '' });
  private defaultEmails   = () => ({ hr: '', support: '', admin: '', general: '' });
  private defaultSupport  = () => ({ email: '', phone: '', helpline: '', hours: '' });
}