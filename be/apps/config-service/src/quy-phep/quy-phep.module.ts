import { Module } from '@nestjs/common';
import { Employee, LeaveBalance, LeaveBalanceEntry } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { QuyPhep_Service } from './quy-phep.service';

@Module({
  imports: [
    DatabaseModule.forFeature([LeaveBalance, LeaveBalanceEntry, Employee]),
  ],
  providers: [QuyPhep_Service],
  exports: [QuyPhep_Service],
})
export class QuyPhep_Module {}
