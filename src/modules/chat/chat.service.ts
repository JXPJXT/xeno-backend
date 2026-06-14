import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private db(tenantId: string) {
    return this.prisma.forTenant(tenantId);
  }

  async findAll(tenantId: string, userId: string) {
    return this.db(tenantId).conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(tenantId: string, userId: string, id: string) {
    const conversation = await this.db(tenantId).conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async create(tenantId: string, userId: string, title: string) {
    return this.db(tenantId).conversation.create({
      data: {
        tenantId,
        userId,
        title,
      },
    });
  }

  async update(tenantId: string, userId: string, id: string, title: string) {
    // Verify ownership
    await this.findOne(tenantId, userId, id);

    return this.db(tenantId).conversation.update({
      where: { id },
      data: { title },
    });
  }

  async delete(tenantId: string, userId: string, id: string) {
    // Verify ownership
    await this.findOne(tenantId, userId, id);

    await this.db(tenantId).conversation.delete({
      where: { id },
    });

    return { success: true };
  }

  async addMessage(
    tenantId: string,
    userId: string,
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    steps?: any,
  ) {
    // Verify conversation ownership
    await this.findOne(tenantId, userId, conversationId);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role,
        content,
        steps: steps ? steps : undefined,
      },
    });

    // Update conversation updatedAt timestamp
    await this.db(tenantId).conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}
