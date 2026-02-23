export type UserStatusChangeLog = {
  oldValue: {
    name: string;
    email: string;
    isActive: boolean;
  };
  newValue: {
    name: string;
    email: string;
    isActive: boolean;
  };
};
