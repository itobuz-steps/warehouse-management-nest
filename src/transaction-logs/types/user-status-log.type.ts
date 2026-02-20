// src/transaction-logs/types/user-status-log.types.ts
export interface UserStatusChangeLog {
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
}
