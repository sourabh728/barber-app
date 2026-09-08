import { UserRole } from '../../../generated/prisma/enums';

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: UserRole;
};
