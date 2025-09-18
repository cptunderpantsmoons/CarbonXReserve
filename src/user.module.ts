import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';
import { Organization } from './org.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Organization])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}