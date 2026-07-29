import type {
  CreateTenantTranslationOverrideDto,
  UpdateTenantLocalePolicyDto,
  UpdateTenantTranslationOverrideDto,
} from '../../dto/localization.dto';

export class UpdateTenantLocalizationPolicyCommand {
  constructor(public readonly input: UpdateTenantLocalePolicyDto) {}
}

export class CreateTenantTranslationOverrideCommand {
  constructor(public readonly input: CreateTenantTranslationOverrideDto) {}
}

export class UpdateTenantTranslationOverrideCommand {
  constructor(
    public readonly overrideId: string,
    public readonly input: UpdateTenantTranslationOverrideDto,
  ) {}
}
