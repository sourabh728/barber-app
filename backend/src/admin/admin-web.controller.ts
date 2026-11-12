import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'node:path';

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
