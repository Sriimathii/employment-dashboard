import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
 
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MatIconModule, MatButtonModule, MatBadgeModule],
  template: `
<div class="app-layout">
  <app-sidebar></app-sidebar>
  <div class="main-content">
    <router-outlet></router-outlet>
  </div>
</div>`,
  styles: [`
    .app-layout { display: flex; height: 100vh; overflow: hidden; }
    .main-content { flex: 1; overflow-y: auto; background: #f5f5f5; }
    :host-context([data-theme='dark']) .main-content { background: #121212; }
  `]
})
export class LayoutComponent {}
 