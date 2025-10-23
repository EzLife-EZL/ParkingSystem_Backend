import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService {
    private logger = new Logger(FirebaseService.name);
    private firebaseAuth: admin.auth.Auth;
    private firestore: admin.firestore.Firestore;

    constructor() {
        // Kiểm tra xem Firebase đã khởi tạo chưa
        if (admin.apps.length === 0) {
            const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
                databaseURL: 'https://parkingsystem-a3839-default-rtdb.firebaseio.com'
            });

            this.logger.log('Firebase initialized');
        } else {

            this.logger.log('Firebase already initialized, using existing instance');
        }

        this.firebaseAuth = admin.auth();
        this.firestore = admin.firestore();
    }

    //firestore methods

    async createFirestoreRecord(path: string, data: any): Promise<any> {
        const ref = this.firestore.doc(path);
        await ref.set(data);
        return { id: ref.id, ...data };
    }

    async readFirestoreRecord(path: string): Promise<any> {
        const ref = this.firestore.doc(path);
        const doc = await ref.get();
        return doc.exists ? doc.data() : null;
    }

    async updateFirestoreRecord(path: string, data: any) {
        const ref = this.firestore.doc(path);
        await ref.update(data);
        return { message: 'Firestore record updated successfully' };
    }

    async deleteFirestoreRecord(path: string) {
        const ref = this.firestore.doc(path);
        await ref.delete();
        return { message: 'Firestore record deleted successfully' };
    }



    // Realtime Database methods
    async createRecord(path: string, data: any): Promise<any> {
        const ref = admin.database().ref(path);
        const newRef = ref.push(); // Firebase tự tạo ID
        const newData = { id: newRef.key, ...data }; // thêm ID vào object trả về
        await newRef.set(newData);
        return newData;
    }


    async readRecord(path: string): Promise<any> {
        const ref = admin.database().ref(path);
        const snapshot = await ref.once('value');
        return snapshot.val();
    }

    async updateRecord(path: string, data: any) {
        const ref = admin.database().ref(path);
        await ref.update(data);
        return { message: 'Record updated successfully' };
    }

    async deleteRecord(path: string) {
        const ref = admin.database().ref(path);
        await ref.remove();
        return { message: 'Record deleted successfully' };
    }
}
