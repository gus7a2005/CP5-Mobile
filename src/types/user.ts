// user.ts
export type ChatUser = {
  uid: string; name: string; email: string; phoneNumber: string;
  birthDate: string; photoUrl: string; createdAt: number;
};
export type PublicUser = Pick<ChatUser, 'uid' | 'name' | 'photoUrl' | 'createdAt'>;
export type PrivateUserData = Pick<ChatUser, 'email' | 'phoneNumber' | 'birthDate'>;
export type RegisterInput = {
  name: string; email: string; password: string;
  phoneNumber: string; birthDate: string; photoUri: string | null;
};
