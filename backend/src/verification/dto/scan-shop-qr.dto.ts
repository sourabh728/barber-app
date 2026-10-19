import { IsNotEmpty, IsString } from 'class-validator';

export class ScanShopQrDto {
  /** Raw QR string scanned by the customer. */
  @IsString()
  @IsNotEmpty()
  qrPayload!: string;
}
