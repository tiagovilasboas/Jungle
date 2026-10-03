import {
  Body,
  BadRequestException,
  Controller,
  Inject,
  Post,
  UseFilters,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProcessWagerUseCase } from '../../application/use-cases/process-wager.use-case.js';
import { DomainExceptionFilter } from './domain-exception.filter.js';
import { ProcessWagerDto } from './process-wager.dto.js';

@Controller('wagers')
@UseFilters(DomainExceptionFilter)
export class ProcessWagerController {
  public constructor(@Inject(ProcessWagerUseCase) private readonly processWager: ProcessWagerUseCase) {}

  @Post()
  public async process(@Body() body: ProcessWagerDto) {
    const dto = plainToInstance(ProcessWagerDto, body);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) throw new BadRequestException(errors);
    return this.processWager.execute(dto);
  }
}
