import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsUUID,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CustomerGender, CustomerStatus } from '@prisma/client';

// ===== CREATE =====

export class CreateCustomerDto {
  @ApiPropertyOptional({ description: 'External ID from source system' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: string;

  @ApiPropertyOptional({ example: 'priya@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'Priya' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ enum: CustomerGender })
  @IsOptional()
  @IsEnum(CustomerGender)
  gender?: CustomerGender;

  @ApiPropertyOptional({ example: '1995-06-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @ApiPropertyOptional({ example: 'ORGANIC' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  acquisitionSource?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

// ===== FILTER =====

export class CustomerFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name, email, phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CustomerGender })
  @IsOptional()
  @IsEnum(CustomerGender)
  gender?: CustomerGender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acquisitionSource?: string;
}

// ===== SUB-RESOURCES =====

export class CreateCustomerAddressDto {
  @ApiPropertyOptional({
    enum: ['BILLING', 'SHIPPING', 'HOME', 'WORK'],
    default: 'HOME',
  })
  @IsOptional()
  @IsString()
  addressType?: string;

  @ApiProperty({ example: '42, MG Road' })
  @IsString()
  @MaxLength(255)
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: 'IN' })
  @IsString()
  @MaxLength(10)
  country: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateCustomerChannelDto {
  @ApiProperty({
    enum: ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP'],
    description: 'Channel type',
  })
  @IsString()
  channelType: string;

  @ApiProperty({
    example: 'priya@example.com',
    description: 'Channel endpoint value',
  })
  @IsString()
  @MaxLength(255)
  channelValue: string;
}

export class UpsertCustomerPreferenceDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'] })
  @IsOptional()
  @IsString()
  preferredChannel?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  quietHoursStart?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  quietHoursEnd?: string;
}

export class CreateCustomerConsentDto {
  @ApiProperty({
    enum: [
      'EMAIL_MARKETING',
      'SMS_MARKETING',
      'WHATSAPP_MARKETING',
      'PUSH_MARKETING',
      'ANALYTICS',
      'PERSONALIZATION',
    ],
  })
  @IsString()
  consentType: string;

  @ApiProperty({ enum: ['GRANTED', 'REVOKED', 'PENDING'] })
  @IsString()
  status: string;

  @ApiPropertyOptional({ example: 'WEB_FORM' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}

export class CreateCustomerDeviceDto {
  @ApiProperty({ example: 'MOBILE' })
  @IsString()
  @MaxLength(50)
  deviceType: string;

  @ApiProperty({ example: 'fcm_token_abc123...' })
  @IsString()
  @MaxLength(500)
  deviceToken: string;

  @ApiProperty({ enum: ['IOS', 'ANDROID', 'WEB', 'DESKTOP'] })
  @IsString()
  platform: string;
}

export class AssignTagDto {
  @ApiProperty({ description: 'Tag ID to assign' })
  @IsUUID()
  tagId: string;
}
