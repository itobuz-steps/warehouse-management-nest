import webPush from 'web-push';
import { SubscriptionDocument } from './entities/subscription.entity';
import config from '../config/config.service';

webPush.setVapidDetails(
  config().MAIL_USER as string,
  config().VAPID_PUBLIC_KEY as string,
  config().VAPID_PUBLIC_KEY as string,
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
