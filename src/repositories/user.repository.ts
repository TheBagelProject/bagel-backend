import UserModel, { UserDocument } from '../models/user.schemal';

export const createUser = async (data: Partial<UserDocument>) => {
  // Always set status to 'ACTIVE' on creation
  return await UserModel.create({ ...data, status: 'ACTIVE' });
};
// Soft delete: set status to 'INACTIVE'
export const softDeleteUser = async (id: string) => {
  return await UserModel.findOneAndUpdate({ userId: id }, { status: 'INACTIVE' }, { new: true });
};

// Hard delete: remove from DB
export const hardDeleteUser = async (id: string) => {
  return await UserModel.findOneAndDelete({ userId: id });
};

export const getAllUsers = async () => {
  return await UserModel.find();
};

export const getUserById = async (id: string) => {
  return await UserModel.findOne({ userId: id });
};

export const updateUser = async (id: string, data: Partial<UserDocument>) => {
  return await UserModel.findOneAndUpdate({ userId: id }, data, { new: true });
};

export const findByUsername = async (username: string) => {
  return await UserModel.findOne({ username });
};

export const findByEmail = async (email: string) => {
  return await UserModel.findOne({ email });
};
