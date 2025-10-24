import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { CacheService } from 'src/cache.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, CacheService],
})
export class ReviewModule { }
