import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService {
    private logger = new Logger(FirebaseService.name);

    constructor() {
        const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json');
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
            databaseURL: 'https://hellodoc-8ddb5-default-rtdb.firebaseio.com'
        });
    }
    
    async createReccord(path: string, data: any): Promise<void> {
        const ref = admin.database().ref(path);
        const newRef = ref.push();
        await newRef.set(data);
        return{id : newRef.key, ...data}
    }

    async readRecord(path: string): Promise<any> {
        const ref = admin.database().ref(path);
        const snapshot = await ref.once('value');
        return snapshot.val();
    }

    async updateRecord(path: string, data: any) {
        const ref = admin.database().ref(path);
        await ref.update(data);
        return{message: 'Record updated successfully'};
    }

    async deleteRecord(path: string) {
        const ref = admin.database().ref(path);
        await ref.remove();
        return {message: 'Record deleted successfully'};
    }
}
