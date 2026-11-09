import { cert, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// firebase-admin 14 dropped the namespaced API (admin.credential, admin.messaging()).
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable not set");
}

const app = initializeApp({
    credential: cert(require(credentialsPath)),
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
        const response = await getMessaging(app).send(message);
        console.log("Successfully sent message:", response);
    } catch (error) {
        console.error("Error sending message:", error);
    }
};
