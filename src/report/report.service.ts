import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Report } from 'src/schemas/report.schema';

@Injectable()
export class ReportService {
    constructor(
        @InjectModel(Report.name) private reportModel: Model<Report>,
        private firebaseService: FirebaseService
    ) { }

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
        return this.firebaseService.readRecord('reports');
    }

    async updateStatus(id: string, status: 'opened' | 'closed') {
        const report = await this.firebaseService.readRecord(`reports/${id}`);
        if (!report) throw new NotFoundException('Report not found');
        report.status = status;
        return report.save();
    }

    async updateResponse(id: string, responseContent: string, responseTime: string) {
        const report = await this.firebaseService.readRecord(`reports/${id}`);
        if (!report) throw new NotFoundException('Report not found');
        report.responseContent = responseContent;
        report.responseTime = responseTime;
        report.status = 'closed';//đổi trạng thái thành 'closed' sau khi phản hồi
        return report.save();
    }

    async deleteReport(id: string) {
        const report = await this.firebaseService.deleteRecord(`reports/${id}`);
        if (!report) throw new NotFoundException('Report not found');
        return { message: 'Deleted successfully' };
    }

}
