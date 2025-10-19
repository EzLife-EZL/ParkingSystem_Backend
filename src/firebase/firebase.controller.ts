import path from 'path';
import { FirebaseService } from './firebase.service';
import { Body, Controller, Param, Post, Get, Put, Delete } from '@nestjs/common';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @Post('create')
  async create(@Body() body: {path: string, data: any}) {
    return this.firebaseService.createReccord(body.path, body.data);
  }

  @Get('read/:path')
  async read(@Param('path') path: string) {
    return this.firebaseService.readRecord(path);
  }

  @Put('update/:path')
  async update(@Param('path') path: string,@Body() data: any) {
    return this.firebaseService.updateRecord(path, data);
  }

  @Delete('delete/:path')
  async delete(@Param('path') path: string) {
    return this.firebaseService.deleteRecord(path);
  }
}
