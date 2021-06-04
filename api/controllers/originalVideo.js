const db = require('../../db/db');
const OriginalVideo = require('../models/originalVideo');
const admin = require('firebase-admin');
const database = db();
const ORIGINAL_VIDEOS_COLL = "originalVideos";
const fs = require('fs');
const { exec } = require("child_process");

module.exports = {
    getAll: async (req, res) => {
        origVideos = [];
        const lastUpdated = new admin.firestore.Timestamp(parseInt(req.params.lastUpdated), 0);
        var snapshot = await database.collection(ORIGINAL_VIDEOS_COLL).where("lastUpdated", ">=", lastUpdated).get();
        snapshot.forEach((doc) => {
            data = doc.data();
            origVideos.push(new OriginalVideo(
                doc.id, 
                data.name, 
                data.uri, 
                data.performer, 
                data.uploadDate._seconds, 
                data.lastUpdated._seconds, 
                data.isDeleted
            ));
        });
    
        res.status(200).send(origVideos);
    },

    create: async (req, res) => {
        const { name, uri, performer } = req.body;
        var timestamp = admin.firestore.FieldValue.serverTimestamp();
        var origVideo = new OriginalVideo(null, name, uri, performer, timestamp, timestamp, false);
        origVideo.id = (await database.collection(ORIGINAL_VIDEOS_COLL).add(origVideo.getObject())).id;

        const videosPath = 'C:\\collage\\final\\leagueTok-server\\videos';
        
         //Create new folder for the original video data
         try {
            fs.mkdirSync(`${videosPath}\\${origVideo.uri}`);
            console.log(`Directory created successfully! - ${videosPath}\\${origVideo.uri}`);

        } catch (error) {
            console.log('Directory Create Failed!');
            res.status(500);
            return res.send(`failed create directory ${origVideo.uri} \n error ${error}`);
        }

        //Run OpenPose
        exec(`bin\\OpenPoseDemo.exe --video "${origVideo.uri}" --write_json "${videosPath}\\${origVideo.id}\\openpose" --net_resolution 320x320 --part_candidates`,
        {
            cwd: 'C:\\collage\\final\\openpose\\openposeGPU'
        }, async (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);

            //Create new folder in videos directory for imitations
            try {
                fs.mkdirSync(`${videosPath}\\${origVideo.id}\\Imitations`);
                console.log(`Directory created successfully! - ${videosPath}\\${origVideo.id}\\Imitations`);
            } catch (error) {
                console.log(`Directory Create Failed! - ${videosPath}\\${origVideo.id}\\Imitations \n error- ${error}` );
            }
            res.status(200).send( origVideo.id );           
        })
    }
}