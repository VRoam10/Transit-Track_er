const admin = require("firebase-admin");

let serviceAccount;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
} else {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable not set");
}

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

