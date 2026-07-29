import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LocalizationCommandService } from '../services/localization-command.service';
import {
  CreateTenantTranslationOverrideCommand,
  UpdateTenantLocalizationPolicyCommand,
  UpdateTenantTranslationOverrideCommand,
} from './localization.commands';

@CommandHandler(UpdateTenantLocalizationPolicyCommand)
export class UpdateTenantLocalizationPolicyHandler implements ICommandHandler<UpdateTenantLocalizationPolicyCommand> {
  constructor(private readonly localization: LocalizationCommandService) {}

  execute(command: UpdateTenantLocalizationPolicyCommand) {
    return this.localization.updatePolicy(command.input);
  }
}

@CommandHandler(CreateTenantTranslationOverrideCommand)
export class CreateTenantTranslationOverrideHandler implements ICommandHandler<CreateTenantTranslationOverrideCommand> {
  constructor(private readonly localization: LocalizationCommandService) {}

  execute(command: CreateTenantTranslationOverrideCommand) {
    return this.localization.createOverride(command.input);
  }
}

@CommandHandler(UpdateTenantTranslationOverrideCommand)
export class UpdateTenantTranslationOverrideHandler implements ICommandHandler<UpdateTenantTranslationOverrideCommand> {
  constructor(private readonly localization: LocalizationCommandService) {}

  execute(command: UpdateTenantTranslationOverrideCommand) {
    return this.localization.updateOverride(command.overrideId, command.input);
  }
}

export const LOCALIZATION_COMMAND_HANDLERS = [
  UpdateTenantLocalizationPolicyHandler,
  CreateTenantTranslationOverrideHandler,
  UpdateTenantTranslationOverrideHandler,
];
