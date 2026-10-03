import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagingModule } from '../messaging/messaging.module';
import { ActivityController } from './activity.controller';
import { RecoveryReminderService } from './recovery-reminder.service';

/** Rastreio de interesse (cliente logado) + lembrete "sentimos sua falta" por SMS. */
@Module({
  imports: [AuthModule, MessagingModule],
  controllers: [ActivityController],
  providers: [RecoveryReminderService],
})
export class RecoveryModule {}
