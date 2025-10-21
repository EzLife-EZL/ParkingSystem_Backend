import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheService } from 'src/cache.service';
import { BookAppointmentDto } from 'src/dtos/appointment.dto';
import { Appointment, AppointmentStatus, ExaminationMethod } from 'src/schemas/Appointment.schema';
import { Doctor } from 'src/schemas/doctor.schema';
import { User } from 'src/schemas/user.schema';
import * as admin from 'firebase-admin';
import { Review } from 'src/schemas/review.schema';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class ParkingStaffService {
    constructor(
        @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Doctor.name) private doctorModel: Model<Doctor>,
        @InjectModel(Review.name) private reviewModel: Model<Review>,
        private cacheService: CacheService,
        private firebaseService: FirebaseService,
    ) { }

    async getPendingReservations() {
        return await this.firebaseService.readRecord('pending-reservations');
    }

    async confirmReservation(reservationId: string) {
        const data = await this.getPendingReservations();

        if (!data) return [];
        const reservations = Object.values(data);

        const reservation = reservations.find((reservation: any) => reservation.id === reservationId);

        if (!reservation) {
            throw new NotFoundException('Reservation not found');
        }

        (reservation as any).status = 'not available';

        return this.firebaseService.updateRecord('pending-reservations', reservation as any);

    }

    // async getDoctorStats(doctorID: string) {
    //     const patientsCount = await this.appointmentModel.countDocuments({
    //         doctor: doctorID,
    //         status: 'done',
    //     });

    //     const ratingsCount = await this.reviewModel.countDocuments({
    //         doctor: doctorID,
    //     });

    //     return { patientsCount, ratingsCount };
    // }

    // // 📌 Đặt lịch hẹn
    // async bookAppointment(bookData: BookAppointmentDto) {
    //     const { doctorID, patientID, patientModel, date, time, status, examinationMethod, reason, notes, totalCost, location } = bookData;

    //     const doctor = await this.doctorModel.findById(doctorID);
    //     if (!doctor) {
    //         throw new NotFoundException('Doctor not found');
    //     }
    //     if (doctorID === patientID) {
    //         throw new BadRequestException('You cannot book an appointment for yourself')
    //     }

    //     //bác sĩ không được đặt lịch hẹn cho chính mình
    //     if (doctorID === patientID) {
    //         throw new BadRequestException('You cannot book an appointment for yourself');
    //     }

    //     // Chặn nếu đã có lịch PENDING
    //     const pendingAppointment = await this.appointmentModel.findOne({
    //         doctor: doctorID,
    //         date,
    //         time,
    //         status: AppointmentStatus.PENDING,
    //     });

    //     if (pendingAppointment) {
    //         throw new BadRequestException('This time slot is already booked');
    //     }

    //     // Xóa cache lịch hẹn bệnh nhân
    //     this.clearPatientAppointmentCache(patientID);

    //     // Tìm lịch đã hủy để tái sử dụng
    //     const cancelledAppointment = await this.appointmentModel.findOne({
    //         doctor: doctorID,
    //         patient: patientID,
    //         date,
    //         time,
    //         status: AppointmentStatus.CANCELLED,
    //     });

    //     let appointment;

    //     if (cancelledAppointment) {
    //         // Cập nhật lại lịch đã huỷ
    //         cancelledAppointment.status = AppointmentStatus.PENDING;
    //         cancelledAppointment.examinationMethod = examinationMethod as ExaminationMethod || 'at_clinic';
    //         cancelledAppointment.reason = reason;
    //         cancelledAppointment.notes = notes;
    //         cancelledAppointment.totalCost = totalCost;
    //         cancelledAppointment.location = location;

    //         await cancelledAppointment.save();
    //         appointment = cancelledAppointment;
    //     } else {
    //         // Tạo cuộc hẹn mới
    //         const newAppointment = new this.appointmentModel({
    //             doctor: doctorID,
    //             patientModel,
    //             patient: patientID,
    //             date,
    //             time,
    //             status: status || AppointmentStatus.PENDING,
    //             examinationMethod: examinationMethod || 'at_clinic',
    //             reason,
    //             notes,
    //             totalCost,
    //             location,
    //         });

    //         await newAppointment.save();
    //         appointment = newAppointment;
    //     }

    //     // Thông báo và xóa cache
    //     await this.notifyDoctor(doctorID, "Bạn có lịch hẹn mới!");
    //     await this.notifyPatient(patientID, "Bạn đã đặt lịch hẹn thành công!");
    //     this.clearDoctorAppointmentCache(doctorID);

    //     return {
    //         message: 'Appointment booked successfully',
    //         appointment,
    //     };
    // }

    // // 📌 Gửi thông báo đến bác sĩ
    // async notifyDoctor(doctorId: string, message: string) {
    //     try {
    //         const doctor = await this.doctorModel.findById(doctorId);
    //         if (doctor?.fcmToken) {
    //             await admin.messaging().send({
    //                 token: doctor.fcmToken,
    //                 notification: {
    //                     title: 'Thông báo lịch hẹn mới',
    //                     body: message,
    //                 },
    //             });
    //             console.log(`Đã gửi thông báo đến bác sĩ ${doctorId}`);
    //         } else {
    //             console.warn(`Bác sĩ ${doctorId} không có fcmToken`);
    //         }
    //     } catch (error) {
    //         console.error(`Lỗi khi gửi thông báo đến bác sĩ ${doctorId}:`, error);
    //     }
    // }

    // // 📌 Gửi thông báo đến bệnh nhân
    // async notifyPatient(patientId: string, message: string) {
    //     try {
    //         var patient = await this.userModel.findById(patientId);
    //         if (!patient) {
    //             patient = await this.doctorModel.findById(patientId);
    //         }
    //         if (patient?.fcmToken) {
    //             await admin.messaging().send({
    //                 token: patient.fcmToken,
    //                 notification: {
    //                     title: 'Thông báo lịch hẹn mới',
    //                     body: message,
    //                 },
    //             });
    //             console.log(`Đã gửi thông báo đến bệnh nhân ${patientId}`);
    //         } else {
    //             console.warn(`Bệnh nhân ${patientId} không có fcmToken`);
    //         }
    //     } catch (error) {
    //         console.error(`Lỗi khi gửi thông báo đến bệnh nhân ${patientId}:`, error);
    //     }
    // }

    // // hàm hủy cache bác sĩ
    // async clearDoctorAppointmentCache(doctorID: string) {
    //     const doctorCacheKey = 'all_doctor_appointments_' + doctorID;
    //     await this.cacheService.deleteCache(doctorCacheKey);
    // }

    // // hàm hủy cache bệnh nhân
    // async clearPatientAppointmentCache(patientID: string) {
    //     const patientCacheKey = 'all_patient_appointments_' + patientID;
    //     await this.cacheService.deleteCache(patientCacheKey);
    // }

    // // 📌 Hủy lịch hẹn
    // async cancelAppointment(id: string) {
    //     const appointment = await this.appointmentModel.findById(id);
    //     if (!appointment) {
    //         throw new NotFoundException('Appointment not found');
    //     }

    //     const patientID = appointment.patient.toString();
    //     const doctorID = appointment.doctor.toString();

    //     appointment.status = AppointmentStatus.CANCELLED;

    //     // Xóa cache bệnh nhân & bác sĩ
    //     await this.clearPatientAppointmentCache(patientID);
    //     await this.clearDoctorAppointmentCache(doctorID);

    //     await this.notifyDoctor(doctorID, "Bệnh nhân hủy lịch hẹn!");
    //     await this.notifyPatient(patientID, "Bạn đã hủy lịch hẹn!");
    //     await appointment.save();

    //     return { message: 'Appointment cancelled successfully' };
    // }

    // // 📌 Xác nhận lịch hẹn
    // async confirmAppointmentDone(id: string) {
    //     const appointment = await this.appointmentModel.findById(id);
    //     if (!appointment) {
    //         throw new NotFoundException('Appointment not found');
    //     }

    //     const patientID = appointment.patient.toString();
    //     const doctorID = appointment.doctor.toString();

    //     // Xóa cache bệnh nhân & bác sĩ
    //     await this.clearPatientAppointmentCache(patientID);
    //     await this.clearDoctorAppointmentCache(doctorID);

    //     appointment.status = AppointmentStatus.DONE;

    //     await this.notifyDoctor(doctorID, "Lịch hẹn đã hoàn thành!");
    //     await this.notifyPatient(patientID, "Lịch hẹn của bạn đã hoàn thành!");
    //     await appointment.save();

    //     return { message: 'Appointment confirmed done successfully', appointment };
    // }

    // // 📌 Lấy danh sách tất cả lịch hẹn
    // async getAllAppointments() {
    //     const cacheKey = 'appointments_cache';
    //     console.log('Trying to get all appointments from cache...');

    //     const cached = await this.cacheService.getCache(cacheKey);
    //     if (cached) {
    //         console.log('Cache HIT');
    //         return cached;
    //     }

    //     console.log('Cache MISS - querying DB');

    //     const appointmentsRaw = await this.appointmentModel.find()
    //         .populate({
    //             path: 'doctor',
    //             match: { isDeleted: false },
    //             select: 'name specialty hospital address',
    //             populate: {
    //                 path: 'specialty',
    //                 select: 'name avatarURL',
    //             },
    //         })
    //         .populate({
    //             path: 'patient',
    //             match: { isDeleted: false },
    //             select: '_id name',
    //         });

    //     const appointments = appointmentsRaw.filter(appt => appt.doctor && appt.patient);
    //     await this.cacheService.setCache(cacheKey, appointments, 10000); //cache for 30 seconds

    //     return appointments;
    // }

    // // Lấy danh sách lịch hẹn của bác sĩ
    // async getDoctorAppointments(doctorID: string) {
    //     const doctor = await this.doctorModel.findById(doctorID);
    //     if (!doctor) {
    //         throw new NotFoundException('Doctor not found');
    //     }

    //     const cacheKey = 'all_doctor_appointments_' + doctorID;
    //     console.log('Trying to get doctor appointments from cache...');

    //     const cached = await this.cacheService.getCache(cacheKey);
    //     if (cached) {
    //         console.log('Cache doctor appointments HIT');
    //         return cached;
    //     }

    //     console.log('Cache MISS - querying DB');
    //     const appointmentsRaw = await this.appointmentModel.find({ doctor: doctorID })
    //         .populate({
    //             path: 'doctor',
    //             match: { isDeleted: false },
    //             select: 'name avatarURL'
    //         })
    //         .populate({
    //             path: 'patient',
    //             match: { isDeleted: false },
    //             select: 'name'
    //         });

    //     const appointments = appointmentsRaw
    //         .filter((appt) => appt.doctor !== null && appt.patient !== null)
    //         .sort((a, b) => {
    //             const dateA = new Date(`${a.date.toISOString().split('T')[0]}T${a.time}`);
    //             const dateB = new Date(`${b.date.toISOString().split('T')[0]}T${b.time}`);
    //             return dateB.getTime() - dateA.getTime();
    //         });


    //     if (!appointments) {
    //         throw new NotFoundException('No appointments found for this doctor');
    //     }

    //     console.log('Setting cache...');
    //     await this.cacheService.setCache(cacheKey, appointments, 30 * 1000); // Cache for 1 hour

    //     return appointments;
    // }

    // // 📌 Lấy danh sách lịch hẹn của bệnh nhân
    // async getPatientAppointments(patientID: string) {
    //     var patient = await this.userModel.findById(patientID);
    //     if (!patient) {
    //         patient = await this.doctorModel.findById(patientID);
    //     }

    //     const cacheKey = 'all_patient_appointments_' + patientID;
    //     console.log('Trying to get patient appointments from cache...');

    //     const cached = await this.cacheService.getCache(cacheKey);
    //     if (cached) {
    //         console.log('Cache patient appointments HIT');
    //         return cached;
    //     }

    //     console.log('Cache MISS - querying DB');
    //     const appointmentsRaw = await this.appointmentModel.find({ patient: patientID })
    //         .populate({ path: 'doctor', match: { isDeleted: false }, select: 'name avatarURL' })
    //         .populate({ path: 'patient', select: 'name' });

    //     const appointments = appointmentsRaw
    //         .filter(appt => appt.doctor !== null)
    //         .sort((a, b) => {
    //             const dateA = new Date(`${a.date.toISOString().split('T')[0]}T${a.time}`);
    //             const dateB = new Date(`${b.date.toISOString().split('T')[0]}T${b.time}`);
    //             return dateB.getTime() - dateA.getTime(); // Mới nhất trước
    //         });

    //     if (!appointments) {
    //         throw new NotFoundException('No appointments found for this patient');
    //     }

    //     console.log('Setting cache...');
    //     await this.cacheService.setCache(cacheKey, appointments, 30 * 1000); // Cache for 1 hour

    //     return appointments;
    // }

    // // 📌 Lấy danh sách lịch hẹn theo status
    // async getAppointmentsByStatus(patientID: string, status: string): Promise<Appointment[]> {
    //     const rawAppointments = await this.appointmentModel.find({
    //         patient: patientID,
    //         status: status,
    //     }).populate({
    //         path: 'doctor',
    //         match: { isDeleted: false },
    //         select: 'name',
    //     });

    //     const appointments = rawAppointments.filter(appt => appt.doctor !== null);
    //     return appointments;
    // }


    // async getAppointmentsbyitsID(id: string) {
    //     const appointment = await this.appointmentModel.findById(id);
    //     return appointment;
    // }

    // async updateAppointment(id: string, updateData: Partial<BookAppointmentDto>) {
    //     const appointment = await this.appointmentModel.findByIdAndUpdate(id, updateData, { new: true });
    //     if (!appointment) {
    //         throw new NotFoundException('Appointment not found');
    //     }

    //     const patientID = appointment.patient.toString();
    //     const doctorID = appointment.doctor.toString();

    //     const patientCacheKey = 'all_patient_appointments_' + patientID;
    //     const doctorCacheKey = 'all_doctor_appointments_' + doctorID;
    //     await this.cacheService.deleteCache(patientCacheKey);
    //     await this.cacheService.deleteCache(doctorCacheKey);

    //     return { message: 'Appointment updated successfully', appointment };
    // }


    // async deleteAppointment(id: string) {
    //     const appointment = await this.appointmentModel.findById(id);
    //     if (!appointment) {
    //         throw new NotFoundException('Appointment not found');
    //     }

    //     const patientID = appointment.patient.toString();
    //     const doctorID = appointment.doctor.toString();

    //     // Xóa lịch hẹn
    //     await this.appointmentModel.findByIdAndDelete(id);

    //     // Xóa cache bệnh nhân & bác sĩ
    //     const patientCacheKey = 'all_patient_appointments_' + patientID;
    //     const doctorCacheKey = 'all_doctor_appointments_' + doctorID;
    //     await this.cacheService.deleteCache(patientCacheKey);
    //     await this.cacheService.deleteCache(doctorCacheKey);

    //     return { message: 'Appointment deleted successfully' };
    // }
}
