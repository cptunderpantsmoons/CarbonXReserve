import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../src/user.controller';
import { UserService } from '../src/user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            register: jest.fn(),
            findUser: jest.fn(),
            updateUser: jest.fn(),
            maskEmail: jest.fn(),
            maskAbn: jest.fn(),
            decryptData: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should register user', async () => {
    const mockResult = { user: {}, organization: {}, token: 'token' };
    jest.spyOn(service, 'register').mockResolvedValue(mockResult);
    const result = await controller.register({ email: 'test@example.com', abn: '123', orgName: 'Test Org' });
    expect(result).toEqual(mockResult);
  });

  it('should return masked user data', async () => {
    const mockUser = {
      id: '1',
      email: 'encrypted',
      organization: { id: '1', name: 'Org', abn: 'encrypted' },
      kycStatus: 'pending',
      role: 'viewer',
      createdAt: new Date(),
    };
    jest.spyOn(service, 'findUser').mockResolvedValue(mockUser);
    jest.spyOn(service, 'decryptData').mockReturnValue('test@example.com');
    jest.spyOn(service, 'maskEmail').mockReturnValue('t***@example.com');
    jest.spyOn(service, 'decryptData').mockReturnValueOnce('123456789');
    jest.spyOn(service, 'maskAbn').mockReturnValue('123***789');
    const req = { user: { id: '1' } };
    const result = await controller.getMe(req);
    expect(result.email).toBe('t***@example.com');
    expect(result.organization.abn).toBe('123***789');
  });

  it('should update user if admin', async () => {
    const mockUser = { id: '1', role: 'trader' };
    jest.spyOn(service, 'updateUser').mockResolvedValue(mockUser);
    const req = { user: { role: 'admin' } };
    const result = await controller.updateUser('1', { role: 'trader' }, req);
    expect(result).toEqual(mockUser);
  });

  it('should throw error if not admin', async () => {
    const req = { user: { role: 'viewer' } };
    await expect(controller.updateUser('1', { role: 'trader' }, req)).rejects.toThrow('Insufficient permissions');
  });
});