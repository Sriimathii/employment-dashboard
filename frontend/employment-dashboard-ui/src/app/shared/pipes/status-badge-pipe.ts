import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusBadge',
})
export class StatusBadgePipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
