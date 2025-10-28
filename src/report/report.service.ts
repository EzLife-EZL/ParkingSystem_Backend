import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Report } from 'src/schemas/report.schema';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<Report>,
    private firebaseService: FirebaseService,
  ) {}

  async createReport(data: {
    bookingId: string;
    content: string;
    createdAt: string;
    slotId: string;
    status: 'opened' | 'closed';
    title: string;
    userId: string;
  }) {
    return this.firebaseService.createRecord('reports', data);
  }

  async getAllReports() {
    const data = await this.firebaseService.readRecord('reports');

    if (!data) return [];
    return Object.entries(data).map(([id, value]: [string, any]) => ({
      _id: id,
      bookingId: value.bookingId ?? null,
      userId: value.userId ?? null,
      slotId: value.slotId ?? null,
      title: value.title ?? null,
      content: value.content ?? null,
      status: value.status ?? null,
      createdAt: value.createdAt ?? null,
    }));
  }

  async updateStatus(id: string, status: 'opened' | 'closed') {
    const report = await this.firebaseService.readRecord(`reports/${id}`);
    if (!report) throw new NotFoundException('Report not found');

    await this.firebaseService.updateRecord(`reports/${id}`, { status });
    return { message: 'Status updated', status };
  }

  async updateResponse(
    id: string,
    responseContent: string,
    responseTime: string,
  ) {
    const report = await this.firebaseService.readRecord(`reports/${id}`);
    if (!report) throw new NotFoundException('Report not found');

    await this.firebaseService.updateRecord(`reports/${id}`, {
      responseContent,
      responseTime,
      status: 'closed',
    });

    return { message: 'Response saved', status: 'closed' };
  }

  async deleteReport(id: string) {
    const report = await this.firebaseService.deleteRecord(`reports/${id}`);
    if (!report) throw new NotFoundException('Report not found');
    return { message: 'Deleted successfully' };
  }
  async getReportsByUser(userId: string) {
    const allReportsObj = await this.firebaseService.readRecord('reports');

    if (!allReportsObj) {
      return [];
    }
    const allReportsArr = Object.entries(allReportsObj).map(
      ([id, value]: [string, any]) => ({
        _id: id,
        bookingId: value.bookingId ?? null,
        slotId: value.slotId ?? null,
        title: value.title ?? null,
        content: value.content ?? null,
        status: value.status ?? null,
        createdAt: value.createdAt ?? null,
        userId: value.userId ?? null,
        responseContent: value.responseContent ?? null,
        responseTime: value.responseTime ?? null,
      }),
    );

    const filtered = allReportsArr.filter((r) => r.userId === userId);
    return filtered;
  }
}
