import type { Role } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  role: Role;
  email: string;
  typ?: "access";
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
};

export type AuthTokensResponse = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};
