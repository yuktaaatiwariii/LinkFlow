import {
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    const date = value instanceof Date ? value : new Date(value as string | number);
    if (isNaN(date.getTime())) {
      return false;
    }

    return date.getTime() > Date.now();
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid future ISO-8601 date string`;
  }
}

export class CreateLinkDto {
  @IsNotEmpty({ message: 'originalUrl is required' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
    },
    {
      message: 'originalUrl must be an absolute URL with http or https protocol',
    },
  )
  originalUrl!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    return new Date(value as string | number);
  })
  @Validate(IsFutureDateConstraint)
  expiresAt?: Date;
}
