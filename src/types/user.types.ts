export type UserRole = 'admin' | 'user';

export interface UserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UserOutput {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}