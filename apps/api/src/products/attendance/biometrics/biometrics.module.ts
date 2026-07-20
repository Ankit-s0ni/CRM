import { Module } from '@nestjs/common';
import { BiometricsController } from './biometrics.controller';
import { BiometricsService } from './biometrics.service';
import { LivenessProvider } from './liveness-provider';
import { PrivateEvidenceStorageService } from './private-evidence-storage.service';

@Module({
  controllers: [BiometricsController],
  providers: [
    BiometricsService,
    LivenessProvider,
    PrivateEvidenceStorageService,
  ],
  exports: [BiometricsService, LivenessProvider, PrivateEvidenceStorageService],
})
export class BiometricsModule {}
