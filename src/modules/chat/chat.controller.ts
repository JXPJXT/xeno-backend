import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId, CurrentUser } from '../../common/decorators';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class UpdateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class AddMessageDto {
  @IsEnum(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  steps?: any;
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'List user conversations' })
  @ApiResponse({ status: 200, description: 'Conversations list' })
  async findAll(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.findAll(tenantId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.findOne(tenantId, userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a conversation' })
  async create(
    @Body() dto: CreateConversationDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.create(tenantId, userId, dto.title);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update conversation title' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.update(tenantId, userId, id, dto.title);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete conversation' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.delete(tenantId, userId, id);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add message to conversation' })
  async addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMessageDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.addMessage(
      tenantId,
      userId,
      id,
      dto.role,
      dto.content,
      dto.steps,
    );
  }
}
