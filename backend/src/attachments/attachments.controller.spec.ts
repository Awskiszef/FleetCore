import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpException } from '@nestjs/common';

describe('AttachmentsController', () => {
  let controller: AttachmentsController;
  let service: AttachmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [
        {
          provide: AttachmentsService,
          useValue: {
            create: jest.fn(),
            findByEntity: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AttachmentsController>(AttachmentsController);
    service = module.get<AttachmentsService>(AttachmentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should throw error on download if attachment does not exist', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(null);
    const mockRes = {
      set: jest.fn(),
      send: jest.fn(),
    };

    await expect(
      controller.download('invalid-id', mockRes as any),
    ).rejects.toThrow(HttpException);
  });
});
