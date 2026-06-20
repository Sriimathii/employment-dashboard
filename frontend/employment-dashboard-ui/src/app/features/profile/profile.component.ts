import { Component, OnInit, signal } from '@angular/core';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

  profile = signal<any>(null);

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService
      .getProfile()
      .subscribe(res => this.profile.set(res));
  }
}