import { UserRepository } from '@modules/user/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<User> {
    return this.userRepository.findById(id);
  }

  /**
   * @desc Find a user by id
   * @param id
   * @returns Promise<User>
   */
  findOne(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  /**
   * @desc Find all users with pagination
   * @param where
   * @param orderBy
   */
  findAll(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.userRepository.findAll(where, orderBy);
  }

  /**
   * @desc Update user information
   * @param id
   * @param updateUserDto
   * @returns Promise<User>
   */
  async update(
    id: string,
    updateUserDto: Prisma.UserUpdateInput,
  ): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return this.userRepository.update(id, updateUserDto);
  }

  /**
   * @desc Create a new user
   * @param createUserDto
   * @returns Promise<User>
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { balance, birthDate, ...fields } = createUserDto;
    const data: Prisma.UserCreateInput = {
      ...fields,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      balance: {
        create: {
          stableCoin: balance ?? 0,
        },
      },
    };
    return this.userRepository.create(data);
  }

  async delete(id: string): Promise<void> {
    const token = await this.userRepository.findById(id);
    if (!token) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    await this.userRepository.delete(id);
  }

  /**
   * @desc Add token IDs to a user's watch list
   * @param userId
   * @param tokenIds
   */
  async addTokensToWatchList(
    userId: string,
    tokenIds: string[],
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const currentWatchList = new Set(user.watchList || []);

    tokenIds.forEach((tokenId) => {
      if (currentWatchList.has(tokenId)) {
        currentWatchList.delete(tokenId);
      } else {
        currentWatchList.add(tokenId);
      }
    });

    await this.userRepository.update(userId, {
      watchList: Array.from(currentWatchList),
    });
  }

  async completeTour(userId: string, tourId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    const current = new Set(user.completedTours ?? []);
    if (current.has(tourId)) {
      return user;
    }
    current.add(tourId);
    return this.userRepository.update(userId, {
      completedTours: Array.from(current),
    });
  }
}
