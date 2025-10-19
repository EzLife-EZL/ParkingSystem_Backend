import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {

    constructor() {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: 'https://hellodoc-8ddb5-default-rtdb.firebaseio.com/',
        });
    }


}
