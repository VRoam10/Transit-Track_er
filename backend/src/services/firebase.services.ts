const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export const sendNotification = async (fcmToken: any, title: any, body: any) => {
    const message = {
        token: fcmToken,
        notification: {
            title,
            body,
        },
    };
    try {
        const response = await admin.messaging().send(message);
        console.log("Successfully sent message:", response);
    } catch (error) {
        console.error("Error sending message:", error);
    }
};

