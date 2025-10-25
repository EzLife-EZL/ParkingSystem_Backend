import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CacheService } from 'src/cache.service';

@Controller('review')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly cacheService: CacheService
  ) { }

}
