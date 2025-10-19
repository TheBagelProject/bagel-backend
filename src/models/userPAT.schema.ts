import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPAT extends Document {
  email: string;
  pat: string;
}

const UserPATSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  pat: { type: String, required: true },
});

export default mongoose.model<IUserPAT>('GithubPat_Table', UserPATSchema);