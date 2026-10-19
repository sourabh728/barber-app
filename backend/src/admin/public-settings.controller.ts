import { Controller, Get } from '@nestjs/common';

import { AdminService } from './admin.service';

/** Unauthenticated settings slice (maintenance + payment policy for apps). */
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('public')
  getPublic() {
    return this.adminService.getPublicSettings();
  }
}
