importScripts("https://www.gstatic.com/firebasejs/9.21.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.21.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBvVulhrZm67Nq9pRwAMiPT12kVrJNyXlY",
  authDomain: "fee-optimizer-notifications.firebaseapp.com",
  projectId: "fee-optimizer-notifications",
  storageBucket: "fee-optimizer-notifications.firebasestorage.app",
  messagingSenderId: "1065382557790",
  appId: "1:1065382557790:web:1f5e166922dde7d3691ccf",
  measurementId: "G-HFP8H173VM",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message: ", payload);

  const notificationTitle = payload.notification.title || "Notification Title";
  const notificationOptions = {
    body: payload.notification.body || "Notification Body",
    icon: payload.notification.icon || "/favicon.ico",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
