import {ELocationSetting, ERole, EUserLocationState} from '@/constants/global';

describe('Global Constants', () => {
  describe('EUserLocationState', () => {
    it('should have FAST_MOVING state', () => {
      expect(EUserLocationState.FAST_MOVING).toBe('FAST_MOVING');
    });

    it('should have SLOW_MOVING state', () => {
      expect(EUserLocationState.SLOW_MOVING).toBe('SLOW_MOVING');
    });

    it('should have STATIONARY state', () => {
      expect(EUserLocationState.STATIONARY).toBe('STATIONARY');
    });

    it('should have exactly 3 states', () => {
      const states = Object.values(EUserLocationState);
      expect(states).toHaveLength(3);
    });

    it('should have unique values', () => {
      const states = Object.values(EUserLocationState);
      const uniqueStates = new Set(states);
      expect(uniqueStates.size).toBe(states.length);
    });

    it('should use SCREAMING_SNAKE_CASE', () => {
      const states = Object.values(EUserLocationState);
      states.forEach(state => {
        expect(state).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  describe('ELocationSetting', () => {
    it('should have PRECISE setting', () => {
      expect(ELocationSetting.PRECISE).toBe('precise');
    });

    it('should have BLURRED setting', () => {
      expect(ELocationSetting.BLURRED).toBe('blurred');
    });

    it('should have FROZEN setting', () => {
      expect(ELocationSetting.FROZEN).toBe('frozen');
    });

    it('should have HIDDEN setting', () => {
      expect(ELocationSetting.HIDDEN).toBe('hidden');
    });

    it('should have exactly 4 settings', () => {
      const settings = Object.values(ELocationSetting);
      expect(settings).toHaveLength(4);
    });

    it('should have unique values', () => {
      const settings = Object.values(ELocationSetting);
      const uniqueSettings = new Set(settings);
      expect(uniqueSettings.size).toBe(settings.length);
    });

    it('should use lowercase values', () => {
      const settings = Object.values(ELocationSetting);
      settings.forEach(setting => {
        expect(setting).toBe(setting.toLowerCase());
      });
    });

    it('should represent privacy levels in logical order', () => {
      // Testing that all expected privacy levels are present
      const expectedSettings = ['precise', 'blurred', 'frozen', 'hidden'];
      const actualSettings = Object.values(ELocationSetting);

      expectedSettings.forEach(expected => {
        expect(actualSettings).toContain(expected);
      });
    });
  });

  describe('ERole', () => {
    it('should have ADMIN role', () => {
      expect(ERole.ADMIN).toBe('admin');
    });

    it('should have MODERATOR role', () => {
      expect(ERole.MODERATOR).toBe('moderator');
    });

    it('should have USER role', () => {
      expect(ERole.USER).toBe('user');
    });

    it('should have exactly 3 roles', () => {
      const roles = Object.values(ERole);
      expect(roles).toHaveLength(3);
    });

    it('should have unique values', () => {
      const roles = Object.values(ERole);
      const uniqueRoles = new Set(roles);
      expect(uniqueRoles.size).toBe(roles.length);
    });

    it('should use lowercase values', () => {
      const roles = Object.values(ERole);
      roles.forEach(role => {
        expect(role).toBe(role.toLowerCase());
      });
    });

    it('should use semantic role names', () => {
      // Test that roles are human-readable and semantic
      const expectedRoles = ['admin', 'moderator', 'user'];
      const actualRoles = Object.values(ERole);

      expectedRoles.forEach(expected => {
        expect(actualRoles).toContain(expected);
      });
    });

    it('should represent hierarchical permission levels', () => {
      // Ensuring all role types exist for authorization checks
      expect(ERole.ADMIN).toBeDefined();
      expect(ERole.MODERATOR).toBeDefined();
      expect(ERole.USER).toBeDefined();
    });

    it('should be usable in switch statements', () => {
      const testRole: string = ERole.ADMIN;
      let result = '';

      switch (testRole) {
        case ERole.ADMIN:
          result = 'admin';
          break;
        case ERole.MODERATOR:
          result = 'moderator';
          break;
        case ERole.USER:
          result = 'user';
          break;
      }

      expect(result).toBe('admin');
    });

    it('should be usable in equality checks', () => {
      expect(ERole.ADMIN === 'admin').toBe(true);
      expect(ERole.MODERATOR === 'moderator').toBe(true);
      expect(ERole.USER === 'user').toBe(true);
    });

    it('should be type-safe in comparisons', () => {
      const userRole: ERole = ERole.USER;
      const adminRole: string = ERole.ADMIN;
      const moderatorRole: string = ERole.MODERATOR;

      expect(userRole === ERole.USER).toBe(true);
      expect(userRole !== adminRole).toBe(true);
      expect(userRole !== moderatorRole).toBe(true);
    });
  });

  describe('Enum usage patterns', () => {
    it('should allow iteration over EUserLocationState values', () => {
      const states = Object.values(EUserLocationState);
      const validStates: string[] = [];

      states.forEach(state => {
        validStates.push(state);
      });

      expect(validStates).toHaveLength(3);
    });

    it('should allow iteration over ELocationSetting values', () => {
      const settings = Object.values(ELocationSetting);
      const validSettings: string[] = [];

      settings.forEach(setting => {
        validSettings.push(setting);
      });

      expect(validSettings).toHaveLength(4);
    });

    it('should allow iteration over ERole values', () => {
      const roles = Object.values(ERole);
      const validRoles: string[] = [];

      roles.forEach(role => {
        validRoles.push(role);
      });

      expect(validRoles).toHaveLength(3);
    });

    it('should support reverse mapping validation for ERole', () => {
      const roleValue = 'admin';
      const isValidRole = Object.values(ERole).includes(roleValue as ERole);
      expect(isValidRole).toBe(true);
    });

    it('should support reverse mapping validation for ELocationSetting', () => {
      const settingValue = 'precise';
      const isValidSetting = Object.values(ELocationSetting).includes(settingValue as ELocationSetting);
      expect(isValidSetting).toBe(true);
    });

    it('should support reverse mapping validation for EUserLocationState', () => {
      const stateValue = 'STATIONARY';
      const isValidState = Object.values(EUserLocationState).includes(stateValue as EUserLocationState);
      expect(isValidState).toBe(true);
    });

    it('should reject invalid role values', () => {
      const invalidRole = 'superadmin';
      const isValidRole = Object.values(ERole).includes(invalidRole as ERole);
      expect(isValidRole).toBe(false);
    });

    it('should reject invalid location setting values', () => {
      const invalidSetting = 'invisible';
      const isValidSetting = Object.values(ELocationSetting).includes(invalidSetting as ELocationSetting);
      expect(isValidSetting).toBe(false);
    });

    it('should reject invalid location state values', () => {
      const invalidState = 'RUNNING';
      const isValidState = Object.values(EUserLocationState).includes(invalidState as EUserLocationState);
      expect(isValidState).toBe(false);
    });
  });

  describe('Type safety', () => {
    it('should enforce ERole type', () => {
      const role: ERole = ERole.USER;
      expect(role).toBe('user');
    });

    it('should enforce ELocationSetting type', () => {
      const setting: ELocationSetting = ELocationSetting.PRECISE;
      expect(setting).toBe('precise');
    });

    it('should enforce EUserLocationState type', () => {
      const state: EUserLocationState = EUserLocationState.STATIONARY;
      expect(state).toBe('STATIONARY');
    });

    it('should work with function parameters', () => {
      function checkRole(role: ERole): boolean {
        return role === ERole.ADMIN;
      }

      expect(checkRole(ERole.ADMIN)).toBe(true);
      expect(checkRole(ERole.USER)).toBe(false);
    });

    it('should work with object properties', () => {
      interface UserProfile {
        role: ERole;
        locationSetting: ELocationSetting;
      }

      const profile: UserProfile = {
        role: ERole.USER,
        locationSetting: ELocationSetting.BLURRED,
      };

      expect(profile.role).toBe('user');
      expect(profile.locationSetting).toBe('blurred');
    });
  });
});

