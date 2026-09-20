import { api, LoginResponse } from "./api";

export type AuthRole = "CUSTOMER" | "BARBER" | "ADMIN";
export type GoogleLoginRole = "CUSTOMER" | "BARBER";

export type SessionUser = {
  id: string;
  email: string;
  role: AuthRole;
  name?: string;
  phone?: string | null;
};

export type ProfileShop = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type CurrentUserResponse = {
  userId: string;
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AuthRole;
  createdAt: string;
  updatedAt: string;
  shop: ProfileShop | null;
};

export type RegisterRole = "CUSTOMER" | "BARBER";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  /** Defaults to CUSTOMER on the backend when omitted. */
  role?: RegisterRole;
};

export type RegisterResponse = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AuthRole;
  createdAt: string;
  updatedAt: string;
};

export type RegisterBarberPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description?: string;
};

export type RegisterBarberShop = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type RegisterBarberResponse = RegisterResponse & {
  shop: RegisterBarberShop;
};

export async function registerWithEmail(payload: RegisterPayload) {
  const response = await api.post<RegisterResponse>("/auth/register", payload);
  return response.data;
}

export async function registerBarber(payload: RegisterBarberPayload) {
  const response = await api.post<RegisterBarberResponse>(
    "/auth/register-barber",
    payload,
  );
  return response.data;
}

export async function loginWithEmail(email: string, password: string) {
  const response = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  return response.data;
}

export async function loginWithGoogleIdToken(
  idToken: string,
  role: GoogleLoginRole = "CUSTOMER",
) {
  const response = await api.post<LoginResponse>("/auth/google", {
    idToken,
    role,
  });

  return response.data;
}

export async function fetchCurrentUser() {
  const response = await api.get<CurrentUserResponse>("/auth/me");
  return response.data;
}

export type UpdateProfilePayload = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

export type UpdateShopPayload = {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export async function updateCurrentUser(payload: UpdateProfilePayload) {
  const response = await api.patch<CurrentUserResponse>("/auth/me", payload);
  return response.data;
}

export async function updateMyShop(payload: UpdateShopPayload) {
  const response = await api.patch<ProfileShop>("/shops/me", payload);
  return response.data;
}

export function sessionUserFromLogin(user: LoginResponse["user"]): SessionUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role as AuthRole,
    name: user.name,
    phone: user.phone,
  };
}

export function sessionUserFromMe(user: CurrentUserResponse): SessionUser {
  return {
    id: user.userId,
    email: user.email,
    role: user.role,
    name: user.name,
    phone: user.phone,
  };
}
