import { Injectable } from '@angular/core';
import { Chart, registerables } from 'chart.js';

// Register ALL Chart.js components once at module level
Chart.register(...registerables);

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
}

@Injectable({ providedIn: 'root' })
export class ChartService {

  destroy(chart: Chart | null | undefined): void {
    try { chart?.destroy(); } catch (_) {}
  }

  /** Safely get/clear a canvas before drawing */
  private prepareCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    // If Chart.js already owns this canvas, destroy it first
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
    return canvas.getContext('2d');
  }

  bar(
    canvas: HTMLCanvasElement,
    labels: string[],
    datasets: ChartDataset[],
    options?: { stacked?: boolean; legendPosition?: 'top'|'bottom'|'left'|'right'|false }
  ): Chart | null {
    try {
      const ctx = this.prepareCanvas(canvas);
      if (!ctx) return null;
      const stacked = options?.stacked ?? false;
      const legendPos = options?.legendPosition ?? 'top';
      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: datasets.map(d => ({
            label: d.label,
            data:  d.data,
            backgroundColor: d.backgroundColor,
            borderRadius: stacked ? 0 : 4,
            borderSkipped: false,
            stack: stacked ? 'stack' : undefined
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 600, easing: 'easeInOutQuart' },
          plugins: {
            legend: legendPos === false
              ? { display: false }
              : {
                  display: true,
                  position: legendPos,
                  labels: {
                    boxWidth: 10,
                    boxHeight: 10,
                    borderRadius: 3,
                    useBorderRadius: true,
                    font: { size: 11 },
                    padding: 12,
                    // Hide legend items where all data is zero
                    filter: (item: any, chartData: any) => {
                      const dsData: number[] = chartData.datasets[item.datasetIndex]?.data ?? [];
                      return dsData.some((v: number) => v > 0);
                    }
                  }
                },
            tooltip: {
              mode: 'index' as const,
              intersect: false,
              callbacks: {
                label: (ctx: any) => {
                  const v = ctx.parsed.y ?? ctx.parsed;
                  return v > 0 ? ` ${ctx.dataset.label}: ${v}` : '';
                }
              },
              filter: (item: any) => (item.parsed.y ?? item.parsed) > 0
            }
          },
          scales: {
            x: {
              stacked,
              grid: { display: false },
              ticks: { font: { size: 11 } }
            },
            y: {
              stacked,
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { font: { size: 11 }, precision: 0 }
            }
          }
        }
      });
    } catch (e) {
      console.error('Bar chart error:', e);
      return null;
    }
  }

  horizontalBar(canvas: HTMLCanvasElement, labels: string[], data: number[], colors: string[]): Chart | null {
    try {
      const ctx = this.prepareCanvas(canvas);
      if (!ctx) return null;
      return new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Count',
            data,
            backgroundColor: colors,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y' as const,
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          plugins: { legend: { display: false } },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: { font: { size: 11 }, precision: 0 }
            },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } }
          }
        }
      });
    } catch (e) {
      console.error('HBar chart error:', e);
      return null;
    }
  }

  pie(canvas: HTMLCanvasElement, labels: string[], data: number[], colors: string[]): Chart | null {
    try {
      const ctx = this.prepareCanvas(canvas);
      if (!ctx) return null;
      return new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 12, font: { size: 11 }, padding: 10 }
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed} employees`
              }
            }
          }
        }
      });
    } catch (e) {
      console.error('Pie chart error:', e);
      return null;
    }
  }

  doughnut(canvas: HTMLCanvasElement, labels: string[], data: number[], colors: string[]): Chart | null {
    try {
      const ctx = this.prepareCanvas(canvas);
      if (!ctx) return null;
      return new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 3,
            borderColor: '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed}`
              }
            }
          }
        }
      });
    } catch (e) {
      console.error('Doughnut chart error:', e);
      return null;
    }
  }
}