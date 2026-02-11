export class SubscribeDto {
  endpoint: string;

  expirationTime?: Date;

  keys?: {
    p256dh?: string;
    auth?: string;
  };
}
