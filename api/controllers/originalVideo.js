const db = require("../../db/db");
const OriginalVideo = require("../models/originalVideo");
const admin = require("firebase-admin");
const database = db();
const fs = require("fs");
const { exec } = require("child_process");
const ORIGINAL_VIDEOS_COLL = "originalVideos";
const ORIG_UPDATES_TOPIC = "origVideoUpdates";

module.exports = {
  getAll: async (req, res) => {
    origVideos = [];
    const lastUpdated = new admin.firestore.Timestamp(
      parseInt(req.params.lastUpdated),
      0
    );
    var snapshot = await database
      .collection(ORIGINAL_VIDEOS_COLL)
      .where("lastUpdated", ">=", lastUpdated)
      .get();
    snapshot.forEach((doc) => {
      data = doc.data();
      origVideos.push(
        new OriginalVideo(
          doc.id,
          data.name,
          data.uri,
          data.performer,
          data.uploadDate._seconds,
          data.lastUpdated._seconds,
          data.isDeleted
        )
      );
    });

    res.status(200).send(origVideos);
  },

  create: async (req, res) => {
    const { name, uri, performer } = req.body;
    var timestamp = admin.firestore.FieldValue.serverTimestamp();
    var origVideo = new OriginalVideo(
      null,
      name,
      uri,
      performer,
      timestamp,
      timestamp,
      false
    );
    origVideo.id = (
      await database.collection(ORIGINAL_VIDEOS_COLL).add(origVideo.getObject())
    ).id;

    const videosPath = "C:\\collage\\final\\leagueTok-server\\videos";

    //Create new folder for the original video data
    try {
      fs.mkdirSync(`${videosPath}\\${origVideo.id}`);
      console.log(
        `Directory created successfully! - ${videosPath}\\${origVideo.id}`
      );
    } catch (error) {
      console.log("Directory Create Failed!");
      res.status(500);
      return res.send(
        `failed create directory ${videosPath}\\${origVideo.id} \n error ${error}`
      );
    }

    try {
      exec(
        `curl.exe --output "${origVideo.id}.mp4" --url "${uri}"`,
        {
          cwd: `${videosPath}\\${origVideo.id}`,
        },
        async (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
            res.status(500).send({ message: "curl video error" });
            return;
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`);
          }
          console.log(`stdout: ${stdout}`);
          //Run OpenPose
          exec(
            `bin\\OpenPoseDemo.exe --video "${videosPath}\\${origVideo.id}\\${origVideo.id}.mp4" --write_json "${videosPath}\\${origVideo.id}\\openpose" --net_resolution 320x320 --part_candidates`,
            {
              cwd: "C:\\collage\\final\\openpose\\openposeGPU",
            },
            async (error, stdout, stderr) => {
              if (error) {
                console.log(`error: ${error.message}`);
                res.status(500).send({ message: "openpose error" });
                return;
              }
              if (stderr) {
                console.log(`stderr: ${stderr}`);
              }
              console.log(`stdout: ${stdout}`);

              //Create new folder in videos directory for imitations
              try {
                fs.mkdirSync(`${videosPath}\\${origVideo.id}\\Imitations`);
                console.log(
                  `Directory created successfully! - ${videosPath}\\${origVideo.id}\\Imitations`
                );
              } catch (error) {
                console.log(
                  `Directory Create Failed! - ${videosPath}\\${origVideo.id}\\Imitations \n error- ${error}`
                );
              }
               // Send push notification to topic
              await admin.messaging().send({
             "data": {
                "title": "New videos are here",
                "message": "Tap here to try them"
              },
              "topic": ORIG_UPDATES_TOPIC
              });
              res.status(200).send({ id: origVideo.id });
              return;
            }
          );
         });
    } catch (error) {
      console.log(`curl video: ${error}`);
      res.status(500).send({ message: "curl video error" });
      return;
    }
  },
};
