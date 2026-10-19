import { IsNotEmpty, IsString } from 'class-validator';

export class ScanServiceStartDto {
  /** Raw customer service-start QR scanned by the barber. */
  @IsString()
  @IsNotEmpty()
  qrPayload!: string;
}
