import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { AttendanceService, GeoLocationConfig } from '../../../core/services/attendance.service';

interface LocationSlot extends GeoLocationConfig {
  gettingLocation: boolean;
}

@Component({
  selector: 'app-geo-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSlideToggleModule,
    MatSnackBarModule, MatProgressBarModule, MatDividerModule,
    MatSelectModule, MatTooltipModule, MatChipsModule
  ],
  template: `
<div class="page-container">

  <div class="page-header">
    <div>
      <h1>Geo-Fencing Settings</h1>
      <p>Configure up to 4 office locations. Employees can check in from any active location.</p>
    </div>
    <div class="header-status">
      <div class="status-pill" [class.active]="geoEnabled" [class.inactive]="!geoEnabled">
        <mat-icon>{{ geoEnabled ? 'shield' : 'shield_off' }}</mat-icon>
        {{ geoEnabled ? 'Geo-Fencing ON' : 'Geo-Fencing OFF' }}
      </div>
    </div>
  </div>

  <mat-progress-bar *ngIf="loading" mode="indeterminate" style="margin-bottom:1.25rem;border-radius:4px"></mat-progress-bar>

  <!-- Master toggle -->
  <mat-card class="master-card">
    <mat-card-content>
      <div class="master-row">
        <div class="master-icon" [class.on]="geoEnabled">
          <mat-icon>my_location</mat-icon>
        </div>
        <div class="master-info">
          <strong>Enable Location-Based Check-In</strong>
          <span>When ON, employees must be within range of at least one active location to check in.</span>
          <span class="master-sub" *ngIf="geoEnabled && activeCount === 0" style="color:#e53935">
            ⚠️ Geo-fencing is ON but no locations are active. Enable at least one location below.
          </span>
          <span class="master-sub" *ngIf="geoEnabled && activeCount > 0" style="color:#2e7d32">
            ✅ {{ activeCount }} active location{{ activeCount > 1 ? 's' : '' }} configured.
            Employees can check in from any of them.
          </span>
        </div>
        <mat-slide-toggle [(ngModel)]="geoEnabled" color="primary" class="master-toggle">
          {{ geoEnabled ? 'Enabled' : 'Disabled' }}
        </mat-slide-toggle>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- How it works -->
  <mat-card class="how-card">
    <mat-card-content>
      <div class="how-row">
        <div class="how-item">
          <mat-icon style="color:#1565c0">location_on</mat-icon>
          <span><strong>Multiple Locations:</strong> Configure up to 4 different office premises.</span>
        </div>
        <div class="how-item">
          <mat-icon style="color:#2e7d32">check_circle</mat-icon>
          <span><strong>Any Location Valid:</strong> Check-in succeeds if within range of any active location.</span>
        </div>
        <div class="how-item">
          <mat-icon style="color:#7b1fa2">gps_fixed</mat-icon>
          <span><strong>GPS Verified:</strong> Employee's browser GPS is checked before every check-in.</span>
        </div>
        <div class="how-item">
          <mat-icon style="color:#e65100">logout</mat-icon>
          <span><strong>Free Check-Out:</strong> Location not required for check-out — from anywhere.</span>
        </div>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- 4 Location Cards -->
  <div class="locations-grid">
    <mat-card class="location-card" *ngFor="let loc of locations; let i = index"
              [class.enabled-card]="loc.enabled"
              [class.disabled-card]="!loc.enabled">

      <!-- Card header -->
      <div class="loc-header">
        <div class="loc-num" [class.num-active]="loc.enabled">{{ i + 1 }}</div>
        <div class="loc-header-info">
          <span class="loc-name-display">{{ loc.name || 'Location ' + (i+1) }}</span>
          <span class="loc-status-badge" [class.badge-on]="loc.enabled" [class.badge-off]="!loc.enabled">
            <mat-icon>{{ loc.enabled ? 'wifi_tethering' : 'wifi_tethering_off' }}</mat-icon>
            {{ loc.enabled ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <mat-slide-toggle [(ngModel)]="loc.enabled" color="primary" class="loc-toggle"
                          [matTooltip]="loc.enabled ? 'Disable this location' : 'Enable this location'">
        </mat-slide-toggle>
      </div>

      <mat-divider style="margin:.75rem 0"></mat-divider>

      <!-- Location Name -->
      <mat-form-field appearance="outline" class="full">
        <mat-label>Location Name</mat-label>
        <mat-icon matPrefix>label</mat-icon>
        <input matInput [(ngModel)]="loc.name"
               [placeholder]="defaultNames[i]"
               [disabled]="!loc.enabled">
        <mat-hint>Shown in attendance records (e.g. Main Office, Branch, Client Site)</mat-hint>
      </mat-form-field>

      <!-- Coordinates -->
      <div class="coords-row">
        <mat-form-field appearance="outline">
          <mat-label>Latitude</mat-label>
          <input matInput type="number" step="0.000001" [(ngModel)]="loc.lat"
                 placeholder="e.g. 13.082700" [disabled]="!loc.enabled">
          <mat-hint>Decimal degrees</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Longitude</mat-label>
          <input matInput type="number" step="0.000001" [(ngModel)]="loc.lng"
                 placeholder="e.g. 80.270700" [disabled]="!loc.enabled">
          <mat-hint>Decimal degrees</mat-hint>
        </mat-form-field>
      </div>

      <!-- GPS button -->
      <button mat-stroked-button color="primary" class="gps-btn"
              (click)="useMyLocation(i)"
              [disabled]="!loc.enabled || loc.gettingLocation">
        <mat-icon>{{ loc.gettingLocation ? 'hourglass_empty' : 'gps_fixed' }}</mat-icon>
        {{ loc.gettingLocation ? 'Getting GPS...' : 'Use My Current GPS' }}
      </button>

      <!-- Coordinate preview -->
      <div class="coord-preview" *ngIf="loc.lat && +loc.lat !== 0 && loc.lng && +loc.lng !== 0">
        <mat-icon>pin_drop</mat-icon>
        <span>{{ loc.lat | number:'1.4-6' }}, {{ loc.lng | number:'1.4-6' }}</span>
        <a [href]="mapsUrl(loc)" target="_blank" class="maps-link" matTooltip="Open in Google Maps">
          <mat-icon>open_in_new</mat-icon>
        </a>
      </div>

      <mat-divider style="margin:.75rem 0"></mat-divider>

      <!-- Radius -->
      <div class="radius-row">
        <mat-form-field appearance="outline" style="flex:1">
          <mat-label>Allowed Radius (m)</mat-label>
          <mat-icon matPrefix>radio_button_checked</mat-icon>
          <input matInput type="number" min="50" max="5000"
                 [(ngModel)]="loc.radius" [disabled]="!loc.enabled">
          <mat-hint>50–5000 metres</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" style="flex:1">
          <mat-label>Quick Select</mat-label>
          <mat-select [(ngModel)]="loc.radius" [disabled]="!loc.enabled">
            <mat-option [value]="'50'">50 m — Same building</mat-option>
            <mat-option [value]="'100'">100 m — Office floor</mat-option>
            <mat-option [value]="'200'">200 m — Office campus</mat-option>
            <mat-option [value]="'500'">500 m — Office area</mat-option>
            <mat-option [value]="'1000'">1 km — Large campus</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Radius visual indicator -->
      <div class="radius-badge" *ngIf="loc.enabled">
        <mat-icon>circle</mat-icon>
        Employees within <strong>{{ loc.radius }}m</strong> of this location can check in
      </div>

    </mat-card>
  </div>

  <!-- Save Button -->
  <div class="save-row">
    <div class="save-summary" *ngIf="geoEnabled">
      <mat-icon>info</mat-icon>
      <span>Saving will activate geo-fencing for <strong>{{ activeCount }}</strong> location(s).</span>
    </div>
    <button mat-raised-button color="primary" (click)="save()" [disabled]="saving" class="save-btn">
      <mat-icon>save</mat-icon>
      {{ saving ? 'Saving...' : 'Save All Geo-Fencing Settings' }}
    </button>
  </div>

</div>`,
  styles: [`
    .page-container { padding: 1.5rem; }

    /* Header */
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem; }
    .page-header h1 { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0 0 .25rem; }
    .page-header p  { color:#666; margin:0; font-size:.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color:#82b1ff; }
    :host-context([data-theme='dark']) .page-header p  { color:rgba(255,255,255,.5); }

    .header-status { display:flex; align-items:center; }
    .status-pill {
      display:flex; align-items:center; gap:.4rem;
      padding:.5rem 1rem; border-radius:20px; font-size:.85rem; font-weight:700;
    }
    .status-pill mat-icon { font-size:18px; }
    .status-pill.active   { background:#e8f5e9; color:#2e7d32; }
    .status-pill.inactive { background:#f5f5f5; color:#757575; }

    /* Master card */
    .master-card { border-radius:14px!important; margin-bottom:1.25rem; }
    .master-row  { display:flex; align-items:center; gap:1.25rem; flex-wrap:wrap; }
    .master-icon {
      width:52px; height:52px; border-radius:14px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      background:#e0e0e0; transition:background .3s;
    }
    .master-icon mat-icon { font-size:28px; color:#bbb; transition:color .3s; }
    .master-icon.on { background:linear-gradient(135deg,#1a237e,#1565c0); }
    .master-icon.on mat-icon { color:white; }
    .master-info { flex:1; display:flex; flex-direction:column; gap:3px; }
    .master-info strong { font-size:1rem; font-weight:700; }
    .master-info span   { font-size:.82rem; color:#666; }
    .master-sub { margin-top:2px; font-weight:600; }
    .master-toggle { margin-left:auto; flex-shrink:0; }

    /* How card */
    .how-card { border-radius:12px!important; margin-bottom:1.5rem; background:#f8f9ff!important; }
    :host-context([data-theme='dark']) .how-card { background:#1a1a2e!important; }
    .how-row  { display:flex; flex-wrap:wrap; gap:1rem; }
    .how-item { display:flex; align-items:flex-start; gap:.5rem; font-size:.82rem; flex:1; min-width:200px; }
    .how-item mat-icon { font-size:20px; width:20px; height:20px; flex-shrink:0; margin-top:1px; }

    /* Location Grid — 2 cols on wide, 1 col on narrow */
    .locations-grid {
      display:grid; grid-template-columns:repeat(2,1fr);
      gap:1.25rem; margin-bottom:1.5rem;
    }
    @media(max-width:900px) { .locations-grid { grid-template-columns:1fr; } }

    /* Location card */
    .location-card {
      border-radius:14px!important; padding:1.25rem!important;
      border-left:5px solid #e0e0e0!important;
      transition:border-color .3s ease, box-shadow .3s ease!important;
    }
    .location-card.enabled-card  { border-left-color:#1565c0!important; box-shadow:0 4px 16px rgba(21,101,192,.1)!important; }
    .location-card.disabled-card { opacity:.7; }
    .location-card.disabled-card:hover { opacity:1; }

    /* Card header */
    .loc-header { display:flex; align-items:center; gap:.75rem; }
    .loc-num {
      width:36px; height:36px; border-radius:10px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-size:1rem; font-weight:800; color:white;
      background:#bbb; transition:background .3s;
    }
    .loc-num.num-active { background:linear-gradient(135deg,#1a237e,#1565c0); }
    .loc-header-info { flex:1; display:flex; flex-direction:column; gap:3px; }
    .loc-name-display { font-weight:700; font-size:.9rem; }
    .loc-status-badge {
      display:inline-flex; align-items:center; gap:3px;
      font-size:.72rem; font-weight:700; padding:2px 8px;
      border-radius:10px;
    }
    .loc-status-badge mat-icon { font-size:12px; width:12px; height:12px; }
    .badge-on  { background:#e8f5e9; color:#2e7d32; }
    .badge-off { background:#f5f5f5; color:#757575; }
    .loc-toggle { margin-left:auto; flex-shrink:0; }

    /* Coords */
    .full { width:100%; }
    .coords-row { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-bottom:.5rem; }

    /* GPS button */
    .gps-btn { margin:.25rem 0 .5rem; font-size:.82rem!important; }
    .gps-btn mat-icon { font-size:16px!important; width:16px!important; height:16px!important; }

    /* Coord preview */
    .coord-preview {
      display:flex; align-items:center; gap:.35rem; font-size:.8rem;
      color:#1565c0; background:#e3f2fd; padding:.35rem .75rem;
      border-radius:8px; margin-bottom:.5rem;
    }
    .coord-preview mat-icon { font-size:16px; }
    .maps-link { display:flex; align-items:center; color:#1565c0; text-decoration:none; margin-left:auto; }
    .maps-link mat-icon { font-size:15px; }

    /* Radius */
    .radius-row { display:flex; gap:.6rem; }
    .radius-badge {
      display:flex; align-items:center; gap:.4rem; font-size:.78rem;
      color:#1565c0; background:#e8eaf6; padding:.35rem .75rem; border-radius:8px; margin-top:.25rem;
    }
    .radius-badge mat-icon { font-size:14px; }

    /* Save row */
    .save-row {
      display:flex; align-items:center; justify-content:space-between;
      flex-wrap:wrap; gap:1rem;
      background:white; border-radius:14px; padding:1.25rem 1.5rem;
      box-shadow:0 2px 12px rgba(0,0,0,.06); border:1px solid #e8eaf6;
    }
    :host-context([data-theme='dark']) .save-row { background:#1a1a2e; border-color:rgba(255,255,255,.08); }
    .save-summary { display:flex; align-items:center; gap:.5rem; font-size:.875rem; color:#555; }
    .save-summary mat-icon { font-size:20px; color:#1565c0; }
    .save-btn { height:50px; font-size:1rem!important; font-weight:700!important; min-width:240px; }
  `]
})
export class GeoSettingsComponent implements OnInit {

  geoEnabled = false;
  loading    = false;
  saving     = false;

  defaultNames = ['Main Office', 'Branch Office', 'Remote Hub', 'Field Office'];

  // 4 location slots, always initialised
  locations: LocationSlot[] = this.defaultNames.map((name, i) => ({
    index:   i + 1,
    name,
    lat:     '0',
    lng:     '0',
    radius:  '200',
    enabled: false,
    gettingLocation: false
  }));

  get activeCount(): number { return this.locations.filter(l => l.enabled).length; }

  constructor(private attSvc: AttendanceService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.loading = true;
    this.attSvc.getMultiGeoSettings().subscribe({
      next: data => {
        this.geoEnabled = data.geoEnabled;
        // Merge server data into slots
        for (const srv of data.locations) {
          const idx = srv.index - 1;
          if (idx >= 0 && idx < 4) {
            this.locations[idx] = {
              ...this.locations[idx],
              name:    srv.name    ?? this.defaultNames[idx],
              lat:     srv.lat     ?? '0',
              lng:     srv.lng     ?? '0',
              radius:  srv.radius  ?? '200',
              enabled: srv.enabled ?? false
            };
          }
        }
      },
      error:    () => this.loading = false,
      complete: () => this.loading = false
    });
  }

  useMyLocation(i: number): void {
    if (!navigator.geolocation) {
      this.snack.open('Your browser does not support geolocation.', '×', { duration: 3000 });
      return;
    }
    this.locations[i].gettingLocation = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.locations[i].lat = (Math.round(pos.coords.latitude  * 1000000) / 1000000).toString();
        this.locations[i].lng = (Math.round(pos.coords.longitude * 1000000) / 1000000).toString();
        this.locations[i].gettingLocation = false;
        this.snack.open(`📍 Location ${i + 1} set to ${this.locations[i].lat}, ${this.locations[i].lng}`, '×', { duration: 4000 });
      },
      _ => {
        this.locations[i].gettingLocation = false;
        this.snack.open('Could not get GPS location. Please allow location access.', '×', { duration: 4000 });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  mapsUrl(loc: LocationSlot): string {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}&z=17`;
  }

  save(): void {
    // Validate: if geo is enabled, at least one location must be active and valid
    if (this.geoEnabled) {
      const activeLocs = this.locations.filter(l => l.enabled);
      if (activeLocs.length === 0) {
        this.snack.open('Please enable at least one location before turning on geo-fencing.', '×', { duration: 4000 });
        return;
      }
      for (const loc of activeLocs) {
        const lat = parseFloat(loc.lat as string);
        const lng = parseFloat(loc.lng as string);
        if (!lat || !lng || lat === 0 || lng === 0) {
          this.snack.open(`"${loc.name}" is enabled but has no valid coordinates. Please enter latitude and longitude.`, '×', { duration: 5000 });
          return;
        }
        const radius = parseFloat(loc.radius as string);
        if (!radius || radius < 50) {
          this.snack.open(`"${loc.name}" radius must be at least 50 metres.`, '×', { duration: 4000 });
          return;
        }
      }
    }

    this.saving = true;

    const payload = {
      geoEnabled: this.geoEnabled,
      locations:  this.locations.map(loc => ({
        name:    loc.name,
        lat:     parseFloat(loc.lat as string) || 0,
        lng:     parseFloat(loc.lng as string) || 0,
        radius:  parseFloat(loc.radius as string) || 200,
        enabled: loc.enabled
      }))
    };

    this.attSvc.saveMultiGeoSettings(payload).subscribe({
      next:     r => this.snack.open(r.message ?? 'Geo-fencing settings saved!', '×', { duration: 4000 }),
      error:    e => this.snack.open(e.error?.message ?? 'Failed to save.', '×', { duration: 4000 }),
      complete: () => this.saving = false
    });
  }
}