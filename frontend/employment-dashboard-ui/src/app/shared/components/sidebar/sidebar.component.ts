import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../core/services/auth.service';
import type { UserRole } from '../../../core/models/user.model';

interface NavChild { label: string; route: string; }
interface NavItem  { label: string; icon: string; route: string; roles: UserRole[]; badge?: number; children?: NavChild[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
<aside [class.collapsed]="collapsed()">

  <!-- Header -->
  <div class="sidebar-header">
    <div class="logo">
      <div class="logo-icon"><mat-icon>grid_view</mat-icon></div>
      <div class="logo-text" *ngIf="!collapsed()">
        <span class="logo-name">WorkForce</span>
        <span class="logo-sub">Management</span>
      </div>
    </div>
    <button mat-icon-button class="collapse-btn" (click)="collapsed.set(!collapsed())">
      <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
    </button>
  </div>

  <!-- User info -->
  <div class="user-info" *ngIf="!collapsed()">
    <div class="avatar">{{ initials() }}</div>
    <div class="user-meta">
      <span class="user-name">{{ user()?.fullName || user()?.username }}</span>
      <span class="user-role" [ngClass]="'role-' + (user()?.role || '').toLowerCase()">{{ user()?.role }}</span>
    </div>
  </div>
  <div class="avatar-only" *ngIf="collapsed()" [matTooltip]="user()?.fullName || ''">{{ initials() }}</div>

  <!-- Nav -->
  <nav class="sidebar-nav">
    <ng-container *ngFor="let item of visibleItems(); let i = index">

      <!-- Item WITH children (expandable) -->
      <ng-container *ngIf="item.children && item.children.length > 0">
        <button class="nav-item nav-parent"
                [class.active]="isParentActive(item)"
                [class.expanded]="expandedItem() === item.label"
                [matTooltip]="collapsed() ? item.label : ''"
                matTooltipPosition="right"
                (click)="toggleExpand(item)">
          <div class="nav-icon-wrap"><mat-icon>{{ item.icon }}</mat-icon></div>
          <span class="nav-label" *ngIf="!collapsed()">{{ item.label }}</span>
          <mat-icon class="expand-icon" *ngIf="!collapsed()">
            {{ expandedItem() === item.label ? 'expand_less' : 'expand_more' }}
          </mat-icon>
        </button>

        <!-- Sub-items -->
        <div class="sub-items"
             *ngIf="!collapsed() && expandedItem() === item.label">
          <a *ngFor="let child of item.children"
             class="nav-sub-item"
             [routerLink]="child.route"
             routerLinkActive="sub-active">
            <mat-icon>chevron_right</mat-icon>
            {{ child.label }}
          </a>
        </div>
      </ng-container>

      <!-- Item WITHOUT children (normal link) -->
      <a *ngIf="!item.children || item.children.length === 0"
         class="nav-item"
         [routerLink]="item.route"
         routerLinkActive="active"
         [matTooltip]="collapsed() ? item.label : ''"
         matTooltipPosition="right">
        <div class="nav-icon-wrap"><mat-icon>{{ item.icon }}</mat-icon></div>
        <span class="nav-label" *ngIf="!collapsed()">{{ item.label }}</span>
        <span class="badge" *ngIf="item.badge && !collapsed()">{{ item.badge }}</span>
        <span class="badge-dot" *ngIf="item.badge && collapsed()"></span>
      </a>

    </ng-container>
  </nav>

  <!-- Footer -->
  <div class="sidebar-footer">
    <a class="nav-item" [routerLink]="settingsRoute()" routerLinkActive="active"
       [matTooltip]="collapsed() ? 'Settings' : ''" matTooltipPosition="right">
      <div class="nav-icon-wrap"><mat-icon>settings</mat-icon></div>
      <span class="nav-label" *ngIf="!collapsed()">Settings</span>
    </a>
    <button class="nav-item logout-btn" (click)="logout()"
            [matTooltip]="collapsed() ? 'Logout' : ''" matTooltipPosition="right">
      <div class="nav-icon-wrap"><mat-icon>logout</mat-icon></div>
      <span class="nav-label" *ngIf="!collapsed()">Logout</span>
    </button>
  </div>
</aside>`,
  styles: [`
    :host { display: contents; }

    aside {
      display: flex; flex-direction: column; height: 100vh;
      background: linear-gradient(180deg, #0d1030 0%, #0a0e2a 100%);
      color: white; width: 260px;
      transition: width 0.3s ease; overflow: hidden; flex-shrink: 0;
      position: sticky; top: 0;
      border-right: 1px solid rgba(255,255,255,.06);
      box-shadow: 4px 0 24px rgba(0,0,0,.3);
    }
    aside.collapsed { width: 72px; }

    /* Header */
    .sidebar-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:.9rem 1rem; border-bottom:1px solid rgba(255,255,255,.07);
    }
    .logo { display:flex; align-items:center; gap:.6rem; overflow:hidden; }
    .logo-icon {
      width:36px; height:36px; border-radius:9px; flex-shrink:0;
      background:linear-gradient(135deg,#00e5ff,#3b82f6);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 12px rgba(0,229,255,.3);
      mat-icon { color:white!important; font-size:19px!important; width:19px!important; height:19px!important; }
    }
    .logo-text { display:flex; flex-direction:column; }
    .logo-name { font-size:.95rem; font-weight:800; color:white; letter-spacing:-.01em; }
    .logo-sub  { font-size:.58rem; color:rgba(255,255,255,.4); text-transform:uppercase; letter-spacing:.8px; }
    .collapse-btn { color:rgba(255,255,255,.4)!important; }
    .collapse-btn:hover { color:rgba(255,255,255,.85)!important; }

    /* User */
    .user-info {
      display:flex; align-items:center; gap:.65rem;
      padding:.85rem 1rem; border-bottom:1px solid rgba(255,255,255,.07);
    }
    .avatar, .avatar-only {
      width:36px; height:36px; border-radius:50%; flex-shrink:0;
      background:linear-gradient(135deg,#3949ab,#1e88e5);
      display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:.75rem; color:white;
      border:2px solid rgba(255,255,255,.15);
    }
    .avatar-only { margin:.75rem auto; cursor:pointer; }
    .user-name { font-size:.82rem; font-weight:600; color:rgba(255,255,255,.9); display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .user-role { font-size:.6rem; padding:2px 8px; border-radius:8px; margin-top:2px; display:inline-block; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
    .role-admin    { background:rgba(139,92,246,.25); color:#c4b5fd; }
    .role-manager  { background:rgba(0,229,255,.15);  color:#67e8f9; }
    .role-employee { background:rgba(34,197,94,.2);   color:#86efac; }

    /* Nav */
    .sidebar-nav { flex:1; padding:.5rem .6rem; overflow-y:auto; overflow-x:hidden; }
    .sidebar-nav::-webkit-scrollbar { width:3px; }
    .sidebar-nav::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px; }

    /* Nav items */
    .nav-item {
      display:flex; align-items:center; gap:.65rem;
      padding:.6rem .7rem; color:rgba(255,255,255,.6);
      text-decoration:none; cursor:pointer; background:none; border:none;
      width:100%; font-size:.855rem; border-radius:9px; margin-bottom:1px;
      transition:all .18s ease; white-space:nowrap; position:relative;
      font-family:'Inter',sans-serif; overflow:hidden;
    }
    .nav-item:hover { background:rgba(255,255,255,.07); color:white; transform:translateX(3px); }
    .nav-item.active {
      background:linear-gradient(135deg,rgba(0,229,255,.15),rgba(59,130,246,.12));
      color:white; font-weight:600;
      border:1px solid rgba(0,229,255,.2);
    }
    .nav-item.active .nav-icon-wrap { background:rgba(0,229,255,.2); }
    .nav-parent { text-align:left; }
    .nav-parent.active, .nav-parent.expanded { color:white; font-weight:600; background:rgba(255,255,255,.06); }

    .nav-icon-wrap {
      width:32px; height:32px; border-radius:7px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      background:rgba(255,255,255,.06);
      transition:all .2s ease;
      mat-icon { font-size:17px!important; width:17px!important; height:17px!important; }
    }
    .nav-item:hover .nav-icon-wrap { background:rgba(255,255,255,.1); }

    .nav-label { flex:1; text-align:left; overflow:hidden; text-overflow:ellipsis; }
    .expand-icon { font-size:16px!important; width:16px!important; height:16px!important; color:rgba(255,255,255,.4); margin-left:auto; transition:transform .2s; }
    .nav-parent.expanded .expand-icon { transform:rotate(0deg); }

    /* Sub-items */
    .sub-items { padding-left:1rem; overflow:hidden; animation:slideDown .2s ease; }
    @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

    .nav-sub-item {
      display:flex; align-items:center; gap:.4rem;
      padding:.45rem .65rem; color:rgba(255,255,255,.5);
      text-decoration:none; font-size:.8rem; border-radius:7px;
      transition:all .15s ease; margin-bottom:1px;
      mat-icon { font-size:14px!important; width:14px!important; height:14px!important; }
    }
    .nav-sub-item:hover   { color:white; background:rgba(255,255,255,.06); padding-left:1rem; }
    .nav-sub-item.sub-active { color:#67e8f9; font-weight:600; background:rgba(0,229,255,.08); padding-left:1rem; }

    .badge {
      margin-left:auto; background:linear-gradient(135deg,#ef4444,#f97316);
      color:white; border-radius:9px; padding:1px 7px;
      font-size:.65rem; font-weight:700;
    }
    .badge-dot {
      position:absolute; top:7px; right:7px;
      width:7px; height:7px; border-radius:50%; background:#ef4444;
    }

    .sidebar-footer { border-top:1px solid rgba(255,255,255,.07); padding:.5rem .6rem; }
    .logout-btn:hover { background:rgba(239,68,68,.15)!important; color:#fca5a5!important; }
  `]
})
export class SidebarComponent {
  collapsed    = signal(false);
  expandedItem = signal<string | null>(null);

  user     = computed(() => this.auth.currentUser());
  initials = computed(() => {
    const n = this.user()?.fullName ?? '';
    return n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  });

  visibleItems = computed(() => {
    const role = this.user()?.role as UserRole;
    const base = role === 'Admin' ? '/admin' : role === 'Manager' ? '/manager' : '/employee';
    return this.buildNavItems(role, base);
  });

  settingsRoute = computed(() => {
    const role = this.user()?.role;
    return role === 'Admin' ? '/admin/settings' : role === 'Manager' ? '/manager/settings' : '/employee/settings';
  });

  constructor(private auth: AuthService, private router: Router) {}

  logout() { this.auth.logout(); }

  isParentActive(item: NavItem): boolean {
    return item.children?.some(c => this.router.url.startsWith(c.route)) ?? false;
  }

  toggleExpand(item: NavItem): void {
    if (this.expandedItem() === item.label) {
      this.expandedItem.set(null);
    } else {
      this.expandedItem.set(item.label);
      // Navigate to first child on first expand
      if (item.children?.length) {
        this.router.navigate([item.children[0].route]);
      }
    }
  }

  private buildNavItems(role: UserRole, base: string): NavItem[] {
    const adminNav: NavItem[] = [
      { label: 'Dashboard',       icon: 'dashboard',       route: `${base}/dashboard`,     roles: ['Admin'] },
      { label: 'Employees',       icon: 'people',           route: `${base}/employees`,     roles: ['Admin'] },
      {
        label: 'Attendance', icon: 'schedule', route: `${base}/attendance`, roles: ['Admin'],
        children: [
          { label: 'Monthly Roster',  route: `${base}/attendance` },
          { label: 'Summary',         route: `${base}/attendance/summary` },
        ]
      },
      { label: 'Leave Requests',  icon: 'event_available',  route: `${base}/leave`,         roles: ['Admin'] },
      { label: 'Reports',         icon: 'assessment',       route: `${base}/reports`,       roles: ['Admin'] },
      { label: 'Notifications',   icon: 'notifications',    route: `${base}/notifications`, roles: ['Admin'] },
      { label: 'Audit Logs',      icon: 'history',          route: `${base}/audit-logs`,    roles: ['Admin'] },
      { label: 'User Management', icon: 'manage_accounts',  route: `${base}/users`,         roles: ['Admin'] },
      { label: 'Geo-Fencing',     icon: 'location_on',      route: `${base}/geo-settings`,  roles: ['Admin'] },
      { label: 'My Profile',      icon: 'person',           route: `${base}/profile`,       roles: ['Admin'] },
    ];

    const managerNav: NavItem[] = [
      { label: 'Dashboard',       icon: 'dashboard',       route: `${base}/dashboard`,     roles: ['Manager'] },
      { label: 'My Team',         icon: 'group',            route: `${base}/team`,          roles: ['Manager'] },
      {
        label: 'Attendance', icon: 'schedule', route: `${base}/attendance`, roles: ['Manager'],
        children: [
          { label: 'Monthly Roster', route: `${base}/attendance` },
          { label: 'Summary',        route: `${base}/attendance/summary` },
        ]
      },
      { label: 'Leave',           icon: 'event_available',  route: `${base}/leave`,         roles: ['Manager'] },
      { label: 'Notifications',   icon: 'notifications',    route: `${base}/notifications`, roles: ['Manager'] },
      { label: 'My Profile',      icon: 'person',           route: `${base}/profile`,       roles: ['Manager'] },
    ];

    const employeeNav: NavItem[] = [
      { label: 'Dashboard',       icon: 'dashboard',       route: `${base}/dashboard`,     roles: ['Employee'] },
      { label: 'My Profile',      icon: 'person',           route: `${base}/profile`,       roles: ['Employee'] },
      { label: 'My Attendance',   icon: 'fingerprint',      route: `${base}/attendance`,    roles: ['Employee'] },
      { label: 'My Leave',        icon: 'beach_access',     route: `${base}/leave`,         roles: ['Employee'] },
      { label: 'Notifications',   icon: 'notifications',    route: `${base}/notifications`, roles: ['Employee'] },
    ];

    return role === 'Admin' ? adminNav : role === 'Manager' ? managerNav : employeeNav;
  }
}