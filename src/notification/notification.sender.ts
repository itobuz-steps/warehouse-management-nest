import webPush from 'web-push';
import { SubscriptionDocument } from './entities/subscription.entity';
import { configDotenv } from 'dotenv';

configDotenv();

webPush.setVapidDetails(
  'mailto: ' + process.env.MAIL_USER,
  process.env.VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string,
);

export async function sendBrowserNotification(
  subscriptions: SubscriptionDocument[],
  payload: object,
) {
  const payloadString = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map((subscription) =>
      webPush
        .sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime
              ? subscription.expirationTime.getTime()
              : null,

            keys: subscription.keys,
          },
          payloadString,
        )
        .catch(() => null),
    ),
  );
}
