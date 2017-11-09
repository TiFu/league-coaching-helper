const firebase = require("firebase");
const configFile = require("./config.json");

var config = {
    apiKey: configFile["apiKey"],
    authDomain: configFile["authDomain"],
    databaseURL: configFile["databaseUrl"],
};

function makeid(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

firebase.initializeApp(config);
const database = firebase.database();


// returns {roomId: , userId }
function joinSession(gameId) {
    return database.ref("/sessions/" + gameId).once("value").then((snapshot) => {
        var roomId = snapshot.val();
        console.log("Registered event callback for room " + roomId);
        return roomId
    }).then(addUserToRoom);
}

function registerDrawListeners(roomId, roomEventCallback, roomEventErrorCallback) {
    database.ref("/rooms/" + roomId).on("value", roomEventCallback, roomEventErrorCallback)
}

function addUserToRoom(roomId) {
    const uid = firebase.auth().currentUser.uid
    console.log("User Info", { "roomId": roomId, "canvasId": uid})
    return clearUndo(roomId, uid).then(() => { 
        return { "roomId": roomId, "userId": uid}; 
    });
}

function clearUndo(roomId, userId) {
    return database.ref("/undo/rooms/" + roomId + "/" + userId).remove().then(() => {
        return database.ref("/rooms/" + roomId + "/" + userId).once("value");
    }).then((data) => {
        let val = data.val();
        if (val == null) {
            val = "";
        }
        console.log("Setting value: ", val)
        return addUndoStep(val, roomId, userId);
    })
}

// returns {roomId: , userId }
function createSession(gameId) {
    const roomId =  makeid(15)
    const ref = database.ref("/sessions").child(gameId).set(roomId).then(() => roomId);

    return ref.then(addUserToRoom)
}

function draw(str, roomId, userId) {
    return database.ref("/rooms/" + roomId + "/" + userId).set(str).then(() => {
        console.log("Added " + str + " to " + roomId)
    })
}

const MAX_UNDO_STEPS = 10;
let undoLowerBound = 0;
let undoUpperBound = 0; // next empty child
function addUndoStep(imageData, roomId, userId) {
  return database.ref("/undo/rooms/" + roomId + "/" + userId)
    .child(undoUpperBound)
    .set(imageData)
    .then(() => {
        undoUpperBound++;
        if (undoUpperBound - undoLowerBound > MAX_UNDO_STEPS) {
          return database.ref("/undo/rooms/" + roomId + "/" + userId)
            .child(undoLowerBound)
            .remove()
            .then(() => {
              undoLowerBound++;
            })
        }
    })
}

function canUndoStep(roomId, userId) {
    return undoLowerBound < undoUpperBound - 1;
}

// returns image data
function undoLast(roomId, userId) {
  // no undo step available
  if (undoLowerBound >= undoUpperBound - 1) {
    return Promise.reject("No undo step available");
  }

  const undoRef = database.ref("/undo/rooms/" + roomId + "/" + userId)
    .child(undoUpperBound - 1)

    return undoRef.remove().then(() => {
      undoUpperBound--;
      return database.ref("/undo/rooms/" + roomId + "/" + userId)
        .child(undoUpperBound - 1)
        .once("value")
    }).then((last) => {
      return database.ref("/rooms/" + roomId + "/" + userId).set(last.val());
    })
}

module.exports =  {
    firebase: firebase,
    registerDrawListeners: registerDrawListeners,
    createSession: createSession,
    joinSession: joinSession,
    draw: draw,
    undoLast: undoLast,
    canUndoStep: canUndoStep,
    addUndoStep: addUndoStep
}