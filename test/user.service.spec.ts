import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../src/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user.entity';
import { Organization } from '../src/org.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepo: any;
  let orgRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(getRepositoryToken(User));
    orgRepo = module.get(getRepositoryToken(Organization));
  });

  it('should register user and create org', async () => {
    const mockOrg = { id: '1', name: 'Test', abn: 'encrypted', encryptedAbn: 'encrypted' };
    const mockUser = { id: '1', email: 'encrypted', orgId: '1' };
    jest.spyOn(orgRepo, 'findOne').mockResolvedValue(null);
    jest.spyOn(orgRepo, 'create').mockReturnValue(mockOrg);
    jest.spyOn(orgRepo, 'save').mockResolvedValue(mockOrg);
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
    jest.spyOn(userRepo, 'create').mockReturnValue(mockUser);
    jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser);
    const result = await service.register('test@example.com', '123', 'Test Org');
    expect(result.user).toEqual(mockUser);
    expect(result.organization).toEqual(mockOrg);
  });

  it('should find user', async () => {
    const mockUser = { id: '1' };
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    const result = await service.findUser('1');
    expect(result).toEqual(mockUser);
  });

  it('should update user', async () => {
    const mockUser = { id: '1', role: 'trader' };
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser);
    const result = await service.updateUser('1', { role: 'trader' });
    expect(result).toEqual(mockUser);
  });
});