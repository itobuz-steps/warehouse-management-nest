import webPush from 'web-push';

import { configDotenv } from 'dotenv';
import { Types } from 'mongoose';

interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface LeanSubscription {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  expirationTime?: Date | null;
  keys: SubscriptionKeys;
}

export interface IBaseSubscription {
  endpoint: string;
  expirationTime?: Date | number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

configDotenv();

webPush.setVapidDetails(
  'mailto: ' + process.env.MAIL_USER,
  process.env.VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string,
);

export async function sendBrowserNotification(
  subscriptions: IBaseSubscription[],
  payload: object,
) {
  const payloadString = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map((subscription) =>
      webPush
        .sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          payloadString,
        )
        .catch(() => {
          console.log('push failed');
        }),
    ),
  );
}
