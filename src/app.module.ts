import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { BootstrapModule } from './bootstrap/bootstrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BootstrapModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
