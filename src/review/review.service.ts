import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheService } from 'src/cache.service';

@Injectable()
export class ReviewService {
    constructor(
        private cacheService: CacheService,
    ) { }

}
