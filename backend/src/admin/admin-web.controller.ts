import {
    Controller,
    Get,
    Header,
    NotFoundException,
    Param,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'node:path';

@Controller()
export class PublicWebController {
  @Get('trimshim')
  @Header('Cache-Control', 'no-store')
  trimshimLanding(@Res() response: Response) {
    return response.sendFile(
      join(process.cwd(), 'public', 'trimshim', 'index.html'),
    );
  }

  @Get('trimshim/:fileName')
  @Header('Cache-Control', 'no-store')
  trimshimAsset(@Param('fileName') fileName: string, @Res() response: Response) {
    const safeFileName = /^[A-Za-z0-9_.-]+$/.test(fileName) ? fileName : null;
    if (!safeFileName) {
      throw new NotFoundException('Asset not found.');
    }

    const filePath = join(process.cwd(), 'public', 'trimshim', safeFileName);
    return response.sendFile(filePath);
  }
}

@Controller('admin')
export class AdminWebController {
  @Get()
  @Header('Cache-Control', 'no-store')
  dashboard(@Res() response: Response) {
    return response.sendFile(
      join(process.cwd(), 'public', 'admin', 'index.html'),
    );
  }
}
