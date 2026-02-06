import webPush from 'web-push';
import { SubscriptionDocument } from './entities/subscription.entity';

webPush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendBrowserNotification(
  subscriptions: SubscriptionDocument[],
  payload: object,
) {
  const payloadString = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map((sub) =>
      webPush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime
              ? sub.expirationTime.getTime()
              : null,

            keys: sub.keys,
          },
          payloadString,
        )
        .catch(() => null),
    ),
  );
}
