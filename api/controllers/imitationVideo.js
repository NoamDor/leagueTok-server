const db = require('../../db/db')
const database = db()
const admin = require('firebase-admin');
const {PythonShell} =require('python-shell'); 
const {Storage} = require('@google-cloud/storage');
const bucketName = 'leaguetok.appspot.com';
const storage = new Storage({keyFilename: 'leaguetok-315613-ac56613e3bf4.json'});
const ImitationVideo = require('../models/imitationVideo');
const IMITATION_VIDEOS_COLL = "imitationVideos";
const USERS_COLL = "users"

module.exports = {
  
  moveFile: async(src, dst) => {
    // Moves the file within the bucket
    await storage.bucket(bucketName).file(src).move(dst);
    const url = await storage.bucket(bucketName).file(dst).getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });
    return url[0];
  },
  
  createVideo: async(req, res) => {
    const { sourceId, link, uid } = req.body;
    var timestamp = admin.firestore.FieldValue.serverTimestamp();
    const srcFileName = 'videos/Imitations/' + uid + '_' + sourceId + '_new';
    const destFileName = 'videos/Imitations/' + uid + '_' + sourceId;

//  Check if uid and sourceId allready exits in the db. 
//  If so, update the record instead of creating a new one.
    var imitVideo = null;
    var isNew = false;

    try{
      var snapshot = await database.collection(IMITATION_VIDEOS_COLL).where("sourceId", "==", sourceId).where("uid", "==", uid)
      .get();    
    } catch(err){
      console.log('Failed to get imit id')
      return res.status(500).send('failed')
    }
    
    snapshot.forEach((doc) => {
        data = doc.data();
        //ImitVideo exists
        imitVideo = new ImitationVideo(doc.id, data.url, data.uid, data.sourceId, data.score, data.uploadDate, data.lastUpdated,
                                       data.isDeleted);
    });


//  ImitVideo does not exists
    if (imitVideo == null) {
      isNew = true;
      imitVideo = new ImitationVideo(null, link, uid, sourceId, 0, timestamp, timestamp, false);

      try{
        imitVideo.id = (await database.collection(IMITATION_VIDEOS_COLL).add(imitVideo.getObject())).id
      } catch(err){
        console.log('Failed')
        res.status(500)
        res.send('failed')
        return;
      }
    }
    
    //Create new folder in videos directory for imitations if doesn't exist
    const imitationsPath = `C:\\collage\\final\\leagueTok-server\\videos\\${sourceId}\\Imitations`;

    try {
      if (!fs.existsSync(`${imitationsPath}`)) {
          fs.mkdirSync(`${imitationsPath}`);      
      }
      console.log(`Directory created successfully! - ${imitationsPath}`);
    } catch (error) {
        console.log(`Directory Create Failed! - ${imitationsPath} \n error- ${error}` );
    }

    //Create directory for the imitation video if doesn't exist
    try {
      if (!fs.existsSync(`${imitationsPath}\\${imitVideo.id}`)) {
        fs.mkdirSync(`${imitationsPath}\\${imitVideo.id}`);
        console.log(`Directory created successfully! - ${imitationsPath}\\${imitVideo.id}`);
      }
    } catch (error) {
        console.log('Directory Create Failed!');
        res.status(500);
        return res.send(`failed create directory ${imitationsPath}\\${imitVideo.id} \n error ${error}`);
    }

    //Download imitation video 
    try {
      exec(`curl.exe --output "${imitVideo.id}.mp4" --url "${link}"`,
            {
                cwd: `${imitationsPath}\\${imitVideo.id}`
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
            });
    } catch (error) {
        console.log(`curl video: ${error}`);
        res.status(500)
        res.send('failed')
        return;
    }

     //Run OpenPose 
     exec(`bin\\OpenPoseDemo.exe --video "${imitationsPath}\\${imitVideo.id}\\${imitVideo.id}.mp4" --write_json "${imitationsPath}\\${imitVideo.id}\\openpose" --net_resolution 320x320 --part_candidates`,
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
         let options = { 
           args: [`./videos/${sourceId}/openpose`, `${imitationsPath}/${imitVideo.id}/openpose`] //An argument which can be accessed in the script using sys.argv[1]
         }; 
     
         try{
           PythonShell.run('./scripts/leagueTokOpenPose.py', options, async (err, result)=>{ 
             if (err){
               console.log(err)
               res.send('Failed on python');
               return;
             }
             imitVideo.score = Number(result[0])
     
             try{
               await database.collection(IMITATION_VIDEOS_COLL).doc(imitVideo.id).update(imitVideo.getObject());
             } catch(err){
               console.log('Failed')
               res.status(500)
               res.send('failed')
               return;
             }
     
             res.send({"result": result[0]})
           });
         } catch(err){
           console.log(err)
           res.status(500)
           res.send('python failed')
           return;
         }
       })

    let options = { 
      args: [`./videos/${sourceId}/openpose`, `${imitationsPath}/${imitVideo.id}/openpose`] //An argument which can be accessed in the script using sys.argv[1]
    }; 

    try{
      PythonShell.run('./scripts/leagueTokOpenPose.py', options, async (err, result)=>{ 
        if (err){
          console.log(err)
          res.send('Failed on python');
          return;
        }
        const pythonScore = Math.round(Number(result[0]));
        // var randomScore = 69;
//      If the record is new
        if (isNew) {
          // imitVideo.score = Math.round(Number(result[0]));
          imitVideo.score = pythonScore;

          // Change to default name in storage            
          const url = module.exports.moveFile(srcFileName, destFileName).catch(console.error);
          imitVideo.url = url;

          await database.collection(IMITATION_VIDEOS_COLL).doc(imitVideo.id).update(imitVideo.getObject());

        } else {
//        The record is not new
//        Does this dance better than what exists already? If yes update, else don't. 
          // if (imitVideo.score < Number(result[0])) {
            if (imitVideo.score < pythonScore) {

            // imitVideo.score = Number(result[0])
            imitVideo.score = pythonScore

            // Change to default name in storage            
            const url = await module.exports.moveFile(srcFileName, destFileName).catch(console.error);

            try{
              await database.collection(IMITATION_VIDEOS_COLL).doc(imitVideo.id).update({
                score: Math.round(imitVideo.score), 
                url: url, 
                uploadDate: timestamp,
                lastUpdated: timestamp 
              });
            } catch(err){
              console.log('Failed to update imit score')
              return res.status(500).send('failed')
            }
          }  
        }
        
        const deviceToken = (await database.collection(USERS_COLL).doc(uid).get()).data().deviceToken
        await admin.messaging().send({
          "data": {
              "title": "Are you ready?",
              "message": "Tap here to find out your score",
              // "score": (Math.round(Number(result[0]))).toString(),
              "score": pythonScore.toString(),
              "sourceId": sourceId
           },
          "token": deviceToken
        });

        res.send({"result": (Math.round(Number(result[0]))).toString()})
        //res.send({"result": randomScore.toString()})
        

      });
    } catch(err){
      console.log(err)
    }
  },

  getAll: async (req, res) => {
    imitVideos = [];
    const lastUpdated = new admin.firestore.Timestamp(parseInt(req.params.lastUpdated), 0);
    var snapshot = await database.collection(IMITATION_VIDEOS_COLL).where("lastUpdated", ">=", lastUpdated).get();
    snapshot.forEach((doc) => {
        data = doc.data();
        imitVideos.push(new ImitationVideo(
            doc.id, 
            data.url,
            data.uid,
            data.sourceId,
            data.score, 
            data.uploadDate._seconds, 
            data.lastUpdated._seconds, 
            data.isDeleted
        ));
    });

    res.status(200).send(imitVideos);
  },

  getUserImitationVideos: async (req, res) => {
    videos = [];
    const lastUpdated = new admin.firestore.Timestamp(parseInt(req.params.lastUpdated), 0);
    var snapshot = await database.collection(IMITATION_VIDEOS_COLL)
      .where("uid", "==", req.params.uid).get();
    snapshot.forEach((doc) => {
        data = doc.data();
        videos.push(new ImitationVideo(
            doc.id, 
            data.url,
            data.uid,
            data.sourceId,
            data.score, 
            data.uploadDate._seconds, 
            data.lastUpdated._seconds, 
            data.isDeleted
        ));
    });

    res.status(200).send(videos);
  },
};
