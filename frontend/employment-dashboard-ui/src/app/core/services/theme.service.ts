import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'emp_theme';
  private _theme: Theme;

  get theme(): Theme { return this._theme; }

  constructor() {
    this._theme = (localStorage.getItem(this.KEY) as Theme) ?? 'system';
    this.apply(this._theme);
  }

  setTheme(t: Theme): void {
    this._theme = t;
    localStorage.setItem(this.KEY, t);
    this.apply(t);
  }

  private apply(t: Theme): void {
    const isDark =
      t === 'dark' ||
      (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const value = isDark ? 'dark' : 'light';

    // Set on BOTH html and body so CSS selectors catch it
    document.documentElement.setAttribute('data-theme', value);
    document.body.setAttribute('data-theme', value);

    // Also update the <html> class for additional targeting
    document.documentElement.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('dark-theme', isDark);
  }

  isDark(): boolean {
    return this._theme === 'dark' ||
      (this._theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
}