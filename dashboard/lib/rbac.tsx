"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { UserRole, RBACUser } from "./types";
import { INITIAL_USERS } from "./api";

export interface RBACContextType {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  currentUser: RBACUser;
  setCurrentUser: (user: RBACUser) => void;
  users: RBACUser[];
  setUsers: React.Dispatch<React.SetStateAction<RBACUser[]>>;
  environment: "SANDBOX" | "PRODUCTION";
  setEnvironment: (env: "SANDBOX" | "PRODUCTION") => void;
  merchantId: string;
  setMerchantId: (id: string) => void;
  hasPermission: (permission: PermissionKey) => boolean;
}

export type PermissionKey =
  | "risk:view"
  | "risk:evaluate"
  | "risk:replay"
  | "sandbox:run"
  | "operations:webhooks_manage"
  | "security:view"
  | "security:manage_keys"
  | "security:manage_users"
  | "developer:api_access"
  | "system:health_view"
  | "system:config_manage";

const ROLE_PERMISSIONS: Record<UserRole, Record<PermissionKey, boolean>> = {
  OWNER: {
    "risk:view": true,
    "risk:evaluate": true,
    "risk:replay": true,
    "sandbox:run": true,
    "operations:webhooks_manage": true,
    "security:view": true,
    "security:manage_keys": true,
    "security:manage_users": true,
    "developer:api_access": true,
    "system:health_view": true,
    "system:config_manage": true,
  },
  ADMIN: {
    "risk:view": true,
    "risk:evaluate": true,
    "risk:replay": true,
    "sandbox:run": true,
    "operations:webhooks_manage": true,
    "security:view": true,
    "security:manage_keys": true,
    "security:manage_users": true,
    "developer:api_access": true,
    "system:health_view": true,
    "system:config_manage": true,
  },
  RISK_ANALYST: {
    "risk:view": true,
    "risk:evaluate": true,
    "risk:replay": true,
    "sandbox:run": true,
    "operations:webhooks_manage": false,
    "security:view": true,
    "security:manage_keys": false,
    "security:manage_users": false,
    "developer:api_access": true,
    "system:health_view": true,
    "system:config_manage": false,
  },
  DEVELOPER: {
    "risk:view": true,
    "risk:evaluate": true,
    "risk:replay": true,
    "sandbox:run": true,
    "operations:webhooks_manage": true,
    "security:view": true,
    "security:manage_keys": true,
    "security:manage_users": false,
    "developer:api_access": true,
    "system:health_view": true,
    "system:config_manage": false,
  },
  VIEWER: {
    "risk:view": true,
    "risk:evaluate": false,
    "risk:replay": false,
    "sandbox:run": false,
    "operations:webhooks_manage": false,
    "security:view": false,
    "security:manage_keys": false,
    "security:manage_users": false,
    "developer:api_access": true,
    "system:health_view": true,
    "system:config_manage": false,
  },
};

const RBACContext = createContext<RBACContextType | null>(null);

export function RBACProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<RBACUser[]>(INITIAL_USERS);
  const [currentRole, setRoleState] = useState<UserRole>("OWNER");
  const [currentUser, setCurrentUser] = useState<RBACUser>(INITIAL_USERS[0]);
  const [environment, setEnvironment] = useState<"SANDBOX" | "PRODUCTION">("SANDBOX");
  const [merchantId, setMerchantId] = useState<string>("m_sandbox");

  const setRole = (role: UserRole) => {
    setRoleState(role);
    const matchingUser = users.find((u) => u.role === role);
    if (matchingUser) {
      setCurrentUser(matchingUser);
    } else {
      setCurrentUser((prev) => ({ ...prev, role }));
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    return ROLE_PERMISSIONS[currentRole]?.[permission] ?? false;
  };

  return (
    <RBACContext.Provider
      value={{
        currentRole,
        setRole,
        currentUser,
        setCurrentUser,
        users,
        setUsers,
        environment,
        setEnvironment,
        merchantId,
        setMerchantId,
        hasPermission,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC(): RBACContextType {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error("useRBAC must be used within an RBACProvider");
  }
  return context;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasPermission } = useRBAC();
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
