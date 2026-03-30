import { IsString } from 'class-validator';

export class GetEntityTimelineDto {
  @IsString()
  entityId: string;
}
