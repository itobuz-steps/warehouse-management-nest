export class SubscribeDto {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export class ShipmentParamsDto {
  id: string;
}
