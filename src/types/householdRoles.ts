export type HouseholdRole = 'manager' | 'member' | 'caregiver' | 'doctor';

export type JoinInviteRole = 'member' | 'caregiver' | 'doctor';

export const HOUSEHOLD_ROLE_LABELS: Record<HouseholdRole, string> = {
  manager: 'Manager',
  member: 'Member',
  caregiver: 'Caregiver',
  doctor: 'Doctor',
};

export const FAMILY_CHANNEL_SLUGS = ['general', 'updates', 'help'] as const;
export const CAREGIVER_CHANNEL_SLUG = 'caregivers' as const;
export const ALL_CHANNEL_SLUGS = [...FAMILY_CHANNEL_SLUGS, CAREGIVER_CHANNEL_SLUG] as const;

export type HouseholdPermissions = {
  canUseAi: boolean;
  canEditMeds: boolean;
  canViewMeds: boolean;
  canEditDoctorNotes: boolean;
  canViewDoctorNotes: boolean;
  canSeeFamilyChat: boolean;
  canSeeCaregiverChat: boolean;
  canInviteMembers: boolean;
  canManageRoles: boolean;
  canEditHousehold: boolean;
  visibleChannelSlugs: string[];
};

export function isHouseholdRole(value: string | null | undefined): value is HouseholdRole {
  return value === 'manager' || value === 'member' || value === 'caregiver' || value === 'doctor';
}

export function isJoinInviteRole(value: string | null | undefined): value is JoinInviteRole {
  return value === 'member' || value === 'caregiver' || value === 'doctor';
}

export function householdPermissions(
  role: HouseholdRole | null,
  inHousehold: boolean
): HouseholdPermissions {
  if (!inHousehold) {
    return {
      canUseAi: true,
      canEditMeds: true,
      canViewMeds: true,
      canEditDoctorNotes: true,
      canViewDoctorNotes: true,
      canSeeFamilyChat: true,
      canSeeCaregiverChat: true,
      canInviteMembers: true,
      canManageRoles: false,
      canEditHousehold: true,
      visibleChannelSlugs: [...ALL_CHANNEL_SLUGS],
    };
  }

  if (!role) {
    return {
      canUseAi: false,
      canEditMeds: false,
      canViewMeds: false,
      canEditDoctorNotes: false,
      canViewDoctorNotes: false,
      canSeeFamilyChat: false,
      canSeeCaregiverChat: false,
      canInviteMembers: false,
      canManageRoles: false,
      canEditHousehold: false,
      visibleChannelSlugs: [],
    };
  }

  const isManager = role === 'manager';
  const isMember = role === 'member';
  const isCaregiver = role === 'caregiver';
  const isDoctor = role === 'doctor';

  const visibleChannelSlugs: string[] = [];
  if (isManager || isMember) {
    visibleChannelSlugs.push(...ALL_CHANNEL_SLUGS);
  } else if (isCaregiver) {
    visibleChannelSlugs.push(CAREGIVER_CHANNEL_SLUG);
  }

  return {
    canUseAi: isManager || isMember,
    canEditMeds: isManager || isMember,
    canViewMeds: isManager || isMember || isDoctor,
    canEditDoctorNotes: isManager || isMember,
    canViewDoctorNotes: isManager || isMember || isDoctor,
    canSeeFamilyChat: isManager || isMember,
    canSeeCaregiverChat: isManager || isMember || isCaregiver,
    canInviteMembers: isManager || isMember,
    canManageRoles: isManager,
    canEditHousehold: isManager,
    visibleChannelSlugs,
  };
}

export function canAssignRole(
  callerRole: HouseholdRole,
  targetRole: HouseholdRole
): boolean {
  if (callerRole === 'manager') return true;
  if (callerRole === 'member') {
    return targetRole === 'member' || targetRole === 'caregiver' || targetRole === 'doctor';
  }
  return false;
}

const ALL_HOUSEHOLD_ROLES: HouseholdRole[] = ['manager', 'member', 'caregiver', 'doctor'];

export function assignableRoles(callerRole: HouseholdRole): HouseholdRole[] {
  return ALL_HOUSEHOLD_ROLES.filter((role) => canAssignRole(callerRole, role));
}

export function canEditMemberRole(
  callerRole: HouseholdRole | null,
  target: { userId: string; role: HouseholdRole },
  createdByUserId: string | null
): boolean {
  if (callerRole !== 'manager') return false;
  if (createdByUserId === target.userId) return false;
  return true;
}

export function canRemoveMember(input: {
  callerRole: HouseholdRole | null;
  callerUserId: string;
  target: { userId: string; role: HouseholdRole };
  createdByUserId: string | null;
  managerCount: number;
}): boolean {
  const { callerRole, callerUserId, target, createdByUserId, managerCount } = input;
  const isSelf = callerUserId === target.userId;

  if (isSelf) {
    if (target.role === 'manager' && managerCount <= 1) return false;
    return true;
  }

  if (callerRole !== 'manager') return false;
  if (createdByUserId === target.userId) return false;
  if (target.role === 'manager' && managerCount <= 1) return false;
  return true;
}
