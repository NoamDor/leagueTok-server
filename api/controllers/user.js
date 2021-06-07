const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db/db')
const admin = require('firebase-admin');
const User = require('../models/user');
const database = db()
const USERS_COLL = "users"

module.exports = {
    connect: async(req, res) => {
        const { uid, fullName, photoUrl } = req.body;
        var timestamp = admin.firestore.FieldValue.serverTimestamp();
        const ref = database.collection('users')

        const snapshot = await ref.doc(uid).get();

        if (!snapshot.empty) {
            // console.log('User already exists');
            // return res.status(200).json({
            //     message: 'User already exists'
            // })
            
            // sign in with google get you here every time
            return res.status(200).json({
                message: 'User added',
            })
        }

        await ref.doc(uid).set({
            name: fullName,
            photoUrl: photoUrl,
            lastUpdated: timestamp,
            isDeleted: false,
            isAdmin: false
        });

        return res.status(200).json({
            message: 'User added',
        })
    },
    getAll: async(req, res) => {
        users = [];
        const lastUpdated = new admin.firestore.Timestamp(parseInt(req.params.lastUpdated), 0);
        var snapshot = await database.collection(USERS_COLL).where("lastUpdated", ">=", lastUpdated).get();
        snapshot.forEach((doc) => {
            data = doc.data();
            users.push(new User(
                doc.id, 
                data.name,
                data.photoUrl,
                data.lastUpdated._seconds, 
                data.isDeleted,
                data.isAdmin
            ));
        });
    
        res.status(200).send(users);
    },
    get: async(req, res) => {
        var user = await database.collection(USERS_COLL).doc(req.params.uid).get();

        res.status(200).send(user.data());
    },
    registerDeviceToken: async(req, res) => {
        const { uid, token } = req.body;
        const docUser = await database.collection(USERS_COLL).doc(uid).get();
        
        if (docUser.exists) {
            await database.collection(USERS_COLL).doc(uid).update({ deviceToken: token });
            return res.status(200).json({ message: 'user changed' });

        }
        else {
            return res.status(404).json({ message: 'user not found' });
        }
    },
    setIsAdmin: async (req, res) => {
        const { uid, isAdmin } = req.body;
        const docUser = await database.collection(USERS_COLL).doc(uid).get();
        
        if (docUser.exists) {
            var timestamp = admin.firestore.FieldValue.serverTimestamp();
            await database.collection(USERS_COLL).doc(uid).update({ 
                lastUpdated: timestamp,
                isAdmin: isAdmin 
            });

            return res.status(200).json({ message: 'user changed' });

        }
        else {
            return res.status(404).json({ message: 'user not found' });
        }
    },
}