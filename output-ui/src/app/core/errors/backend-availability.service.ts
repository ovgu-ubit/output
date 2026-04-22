import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BackendAvailabilityService {
  private unavailable = false;

  isUnavailable(): boolean {
    return this.unavailable;
  }

  markUnavailable(): boolean {
    const changed = !this.unavailable;
    this.unavailable = true;
    return changed;
  }

  markAvailable(): boolean {
    const changed = this.unavailable;
    this.unavailable = false;
    return changed;
  }
}
