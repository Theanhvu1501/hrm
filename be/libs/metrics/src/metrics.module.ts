import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),
    makeGaugeProvider({
      name: 'active_employees',
      help: 'Number of active employees',
    }),
    makeCounterProvider({
      name: 'attendance_records_total',
      help: 'Total attendance records',
      labelNames: ['tenant_id', 'type'],
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
