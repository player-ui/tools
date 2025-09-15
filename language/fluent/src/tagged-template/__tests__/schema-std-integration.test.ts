import { describe, test, expect } from "vitest";
import type { Schema } from "@player-ui/types";
import { extractBindingsFromSchema } from "../extract-bindings-from-schema";
import {
  and,
  or,
  not,
  equal,
  notEqual,
  greaterThan,
  lessThan,
  greaterThanOrEqual,
  add,
  subtract,
  multiply,
  divide,
  conditional,
  literal,
  call,
  xor,
  modulo,
} from "../std";

describe("extractBindingsFromSchema - Refactored", () => {
  describe("unit tests", () => {
    test("handles simple primitive types in ROOT", () => {
      const schema = {
        ROOT: {
          name: { type: "StringType" },
          age: { type: "NumberType" },
          isActive: { type: "BooleanType" },
        },
      } as const satisfies Schema.Schema;

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.name.toString()).toBe("{{name}}");
      expect(bindings.age.toString()).toBe("{{age}}");
      expect(bindings.isActive.toString()).toBe("{{isActive}}");
    });

    test("handles nested object references", () => {
      const schema = {
        ROOT: {
          user: { type: "UserType" },
        },
        UserType: {
          firstName: { type: "StringType" },
          lastName: { type: "StringType" },
          profile: { type: "ProfileType" },
        },
        ProfileType: {
          bio: { type: "StringType" },
          age: { type: "NumberType" },
        },
      } as const satisfies Schema.Schema;

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.user.firstName.toString()).toBe("{{user.firstName}}");
      expect(bindings.user.lastName.toString()).toBe("{{user.lastName}}");
      expect(bindings.user.profile.bio.toString()).toBe("{{user.profile.bio}}");
      expect(bindings.user.profile.age.toString()).toBe("{{user.profile.age}}");
    });

    test("handles arrays of primitives with correct structure", () => {
      const schema = {
        ROOT: {
          tags: { type: "StringType", isArray: true },
          scores: { type: "NumberType", isArray: true },
          flags: { type: "BooleanType", isArray: true },
        },
      } as const satisfies Schema.Schema;

      const bindings = extractBindingsFromSchema(schema);

      // String arrays have 'name' property
      expect(bindings.tags.name.toString()).toBe("{{tags._current_}}");

      // Number and boolean arrays have 'value' property
      expect(bindings.scores.value.toString()).toBe("{{scores._current_}}");
      expect(bindings.flags.value.toString()).toBe("{{flags._current_}}");
    });

    test("handles arrays of complex types", () => {
      const schema = {
        ROOT: {
          users: { type: "UserType", isArray: true },
        },
        UserType: {
          id: { type: "NumberType" },
          name: { type: "StringType" },
          settings: { type: "SettingsType" },
        },
        SettingsType: {
          theme: { type: "StringType" },
          notifications: { type: "BooleanType" },
        },
      } as const satisfies Schema.Schema;

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.users.id.toString()).toBe("{{users._current_.id}}");
      expect(bindings.users.name.toString()).toBe("{{users._current_.name}}");
      expect(bindings.users.settings.theme.toString()).toBe(
        "{{users._current_.settings.theme}}",
      );
      expect(bindings.users.settings.notifications.toString()).toBe(
        "{{users._current_.settings.notifications}}",
      );
    });

    test("handles nested arrays", () => {
      const schema = {
        ROOT: {
          matrix: { type: "RowType", isArray: true },
        },
        RowType: {
          cells: { type: "NumberType", isArray: true },
          metadata: { type: "MetadataType" },
        },
        MetadataType: {
          label: { type: "StringType" },
        },
      } as const satisfies Schema.Schema;

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.matrix.cells.value.toString()).toBe(
        "{{matrix._current_.cells._current_}}",
      );
      expect(bindings.matrix.metadata.label.toString()).toBe(
        "{{matrix._current_.metadata.label}}",
      );
    });

    test("handles record types", () => {
      const schema = {
        ROOT: {
          config: { type: "ConfigType", isRecord: true },
        },
        ConfigType: {
          key1: { type: "StringType" },
          key2: { type: "NumberType" },
          nested: { type: "NestedType" },
        },
        NestedType: {
          value: { type: "BooleanType" },
        },
      } as const satisfies Schema.Schema;

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.config.key1.toString()).toBe("{{config.key1}}");
      expect(bindings.config.key2.toString()).toBe("{{config.key2}}");
      expect(bindings.config.nested.value.toString()).toBe(
        "{{config.nested.value}}",
      );
    });

    test("handles deeply nested structures", () => {
      const schema = {
        ROOT: {
          level1: { type: "Level1Type" },
        },
        Level1Type: {
          level2: { type: "Level2Type" },
        },
        Level2Type: {
          level3: { type: "Level3Type" },
        },
        Level3Type: {
          level4: { type: "Level4Type" },
        },
        Level4Type: {
          value: { type: "StringType" },
        },
      } as const satisfies Schema.Schema;

      const bindings = extractBindingsFromSchema(schema);

      expect(bindings.level1.level2.level3.level4.value.toString()).toBe(
        "{{level1.level2.level3.level4.value}}",
      );
    });
  });

  describe("end-to-end test with all JSON value variants", () => {
    test("comprehensive schema with all variants + std.ts integration", () => {
      // Create a comprehensive schema with all possible JSON value types
      const comprehensiveSchema = {
        ROOT: {
          // Primitive types
          stringField: { type: "StringType" },
          numberField: { type: "NumberType" },
          booleanField: { type: "BooleanType" },

          // Arrays of primitives
          stringArray: { type: "StringType", isArray: true },
          numberArray: { type: "NumberType", isArray: true },
          booleanArray: { type: "BooleanType", isArray: true },

          // Complex object
          user: { type: "UserType" },

          // Array of complex objects
          transactions: { type: "TransactionType", isArray: true },

          // Record type (dynamic key-value pairs)
          metadata: { type: "MetadataType", isRecord: true },

          // Nested structures
          organization: { type: "OrganizationType" },

          // Mixed array (array of mixed types through references)
          mixedItems: { type: "MixedItemType", isArray: true },
        },

        UserType: {
          id: { type: "NumberType" },
          username: { type: "StringType" },
          email: { type: "StringType" },
          isVerified: { type: "BooleanType" },
          profile: { type: "ProfileType" },
          preferences: { type: "PreferencesType" },
          roles: { type: "StringType", isArray: true },
          scores: { type: "NumberType", isArray: true },
        },

        ProfileType: {
          firstName: { type: "StringType" },
          lastName: { type: "StringType" },
          bio: { type: "StringType" },
          birthYear: { type: "NumberType" },
          avatar: { type: "AvatarType" },
          addresses: { type: "AddressType", isArray: true },
        },

        AvatarType: {
          url: { type: "StringType" },
          size: { type: "NumberType" },
          isPublic: { type: "BooleanType" },
        },

        AddressType: {
          street: { type: "StringType" },
          city: { type: "StringType" },
          zipCode: { type: "StringType" },
          country: { type: "StringType" },
          isPrimary: { type: "BooleanType" },
          coordinates: { type: "CoordinatesType" },
        },

        CoordinatesType: {
          latitude: { type: "NumberType" },
          longitude: { type: "NumberType" },
        },

        PreferencesType: {
          theme: { type: "StringType" },
          language: { type: "StringType" },
          emailNotifications: { type: "BooleanType" },
          pushNotifications: { type: "BooleanType" },
          privacy: { type: "PrivacyType" },
        },

        PrivacyType: {
          profileVisibility: { type: "StringType" },
          showEmail: { type: "BooleanType" },
          showLocation: { type: "BooleanType" },
        },

        TransactionType: {
          id: { type: "StringType" },
          amount: { type: "NumberType" },
          currency: { type: "StringType" },
          timestamp: { type: "NumberType" },
          status: { type: "StringType" },
          isCompleted: { type: "BooleanType" },
          merchant: { type: "MerchantType" },
          tags: { type: "StringType", isArray: true },
        },

        MerchantType: {
          name: { type: "StringType" },
          category: { type: "StringType" },
          rating: { type: "NumberType" },
          isVerified: { type: "BooleanType" },
        },

        MetadataType: {
          version: { type: "StringType" },
          buildNumber: { type: "NumberType" },
          isProduction: { type: "BooleanType" },
          features: { type: "StringType", isArray: true },
          limits: { type: "LimitsType" },
        },

        LimitsType: {
          maxUsers: { type: "NumberType" },
          maxStorage: { type: "NumberType" },
          maxTransactions: { type: "NumberType" },
          isUnlimited: { type: "BooleanType" },
        },

        OrganizationType: {
          name: { type: "StringType" },
          employeeCount: { type: "NumberType" },
          isActive: { type: "BooleanType" },
          departments: { type: "DepartmentType", isArray: true },
          headquarters: { type: "AddressType" },
        },

        DepartmentType: {
          name: { type: "StringType" },
          budget: { type: "NumberType" },
          headCount: { type: "NumberType" },
          isOperational: { type: "BooleanType" },
          projects: { type: "StringType", isArray: true },
        },

        MixedItemType: {
          type: { type: "StringType" },
          data: { type: "MixedDataType" },
        },

        MixedDataType: {
          stringValue: { type: "StringType" },
          numberValue: { type: "NumberType" },
          booleanValue: { type: "BooleanType" },
          arrayValue: { type: "StringType", isArray: true },
        },
      } as const satisfies Schema.Schema;

      // Extract bindings
      const bindings = extractBindingsFromSchema(comprehensiveSchema);

      // Test primitive bindings
      expect(bindings.stringField.toString()).toBe("{{stringField}}");
      expect(bindings.numberField.toString()).toBe("{{numberField}}");
      expect(bindings.booleanField.toString()).toBe("{{booleanField}}");

      // Test array bindings
      expect(bindings.stringArray.name.toString()).toBe(
        "{{stringArray._current_}}",
      );
      expect(bindings.numberArray.value.toString()).toBe(
        "{{numberArray._current_}}",
      );
      expect(bindings.booleanArray.value.toString()).toBe(
        "{{booleanArray._current_}}",
      );

      // Test complex nested bindings
      expect(bindings.user.profile.firstName.toString()).toBe(
        "{{user.profile.firstName}}",
      );
      expect(bindings.user.profile.addresses.city.toString()).toBe(
        "{{user.profile.addresses._current_.city}}",
      );
      expect(
        bindings.user.profile.addresses.coordinates.latitude.toString(),
      ).toBe("{{user.profile.addresses._current_.coordinates.latitude}}");

      // Test array of complex objects
      expect(bindings.transactions.amount.toString()).toBe(
        "{{transactions._current_.amount}}",
      );
      expect(bindings.transactions.merchant.name.toString()).toBe(
        "{{transactions._current_.merchant.name}}",
      );
      expect(bindings.transactions.tags.name.toString()).toBe(
        "{{transactions._current_.tags._current_}}",
      );

      // Test record type bindings
      expect(bindings.metadata.version.toString()).toBe("{{metadata.version}}");
      expect(bindings.metadata.limits.maxUsers.toString()).toBe(
        "{{metadata.limits.maxUsers}}",
      );

      // =================================================================
      // STD.TS INTEGRATION TESTS
      // =================================================================

      // Test logical operations with boolean bindings
      const userIsVerifiedAndActive = and(
        bindings.user.isVerified,
        bindings.booleanField,
      );
      expect(userIsVerifiedAndActive.toString()).toBe(
        "@[{{user.isVerified}} && {{booleanField}}]@",
      );

      const userHasNotifications = or(
        bindings.user.preferences.emailNotifications,
        bindings.user.preferences.pushNotifications,
      );
      expect(userHasNotifications.toString()).toBe(
        "@[{{user.preferences.emailNotifications}} || {{user.preferences.pushNotifications}}]@",
      );

      const privacyIsPrivate = not(bindings.user.preferences.privacy.showEmail);
      expect(privacyIsPrivate.toString()).toBe(
        "@[!{{user.preferences.privacy.showEmail}}]@",
      );

      // Test comparison operations with string bindings
      const usernameEquals = equal(bindings.user.username, "john_doe");
      expect(usernameEquals.toString()).toBe(
        '@[{{user.username}} == "john_doe"]@',
      );

      const themeIsNotDark = notEqual(bindings.user.preferences.theme, "dark");
      expect(themeIsNotDark.toString()).toBe(
        '@[{{user.preferences.theme}} != "dark"]@',
      );

      // Test numeric operations
      const ageIsGreaterThan = greaterThan(
        bindings.user.profile.birthYear,
        1990,
      );
      expect(ageIsGreaterThan.toString()).toBe(
        "@[{{user.profile.birthYear}} > 1990]@",
      );

      const transactionIsLarge = greaterThanOrEqual(
        bindings.transactions.amount,
        1000,
      );
      expect(transactionIsLarge.toString()).toBe(
        "@[{{transactions._current_.amount}} >= 1000]@",
      );

      const scoresAreLow = lessThan(bindings.user.scores.value, 50);
      expect(scoresAreLow.toString()).toBe(
        "@[{{user.scores._current_}} < 50]@",
      );

      // Test arithmetic operations
      const totalBudget = add(
        bindings.organization.departments.budget,
        bindings.metadata.limits.maxStorage,
      );
      expect(totalBudget.toString()).toBe(
        "@[{{organization.departments._current_.budget}} + {{metadata.limits.maxStorage}}]@",
      );

      const priceDifference = subtract(
        bindings.transactions.amount,
        bindings.numberField,
      );
      expect(priceDifference.toString()).toBe(
        "@[{{transactions._current_.amount}} - {{numberField}}]@",
      );

      const doubleEmployees = multiply(bindings.organization.employeeCount, 2);
      expect(doubleEmployees.toString()).toBe(
        "@[{{organization.employeeCount}} * 2]@",
      );

      const averageRating = divide(
        bindings.transactions.merchant.rating,
        bindings.user.scores.value,
      );
      expect(averageRating.toString()).toBe(
        "@[{{transactions._current_.merchant.rating}} / {{user.scores._current_}}]@",
      );

      // Test complex conditional operations
      const displayName = conditional(
        equal(bindings.user.preferences.privacy.profileVisibility, "private"),
        literal("Anonymous"),
        bindings.user.profile.firstName,
      );
      expect(displayName.toString()).toBe(
        '@[{{user.preferences.privacy.profileVisibility}} == "private" ? "Anonymous" : {{user.profile.firstName}}]@',
      );

      // Test with array element comparisons
      const isPrimaryAddress = equal(
        bindings.user.profile.addresses.isPrimary,
        true,
      );
      expect(isPrimaryAddress.toString()).toBe(
        "@[{{user.profile.addresses._current_.isPrimary}} == true]@",
      );

      // Test complex nested conditions with mixed types
      const canProcessTransaction = and(
        bindings.organization.isActive,
        greaterThan(bindings.metadata.limits.maxTransactions, 0),
        not(bindings.metadata.isProduction),
        or(
          equal(bindings.transactions.status, "pending"),
          equal(bindings.transactions.status, "processing"),
        ),
      );
      expect(canProcessTransaction.toString()).toBe(
        '@[{{organization.isActive}} && {{metadata.limits.maxTransactions}} > 0 && !{{metadata.isProduction}} && ({{transactions._current_.status}} == "pending" || {{transactions._current_.status}} == "processing")]@',
      );

      // Test with nested array access
      const hasValidCoordinates = and(
        greaterThan(bindings.user.profile.addresses.coordinates.latitude, -90),
        lessThan(bindings.user.profile.addresses.coordinates.latitude, 90),
        greaterThan(
          bindings.user.profile.addresses.coordinates.longitude,
          -180,
        ),
        lessThan(bindings.user.profile.addresses.coordinates.longitude, 180),
      );
      expect(hasValidCoordinates.toString()).toBe(
        "@[{{user.profile.addresses._current_.coordinates.latitude}} > -90 && {{user.profile.addresses._current_.coordinates.latitude}} < 90 && {{user.profile.addresses._current_.coordinates.longitude}} > -180 && {{user.profile.addresses._current_.coordinates.longitude}} < 180]@",
      );

      // Test function calls with bindings
      const formatUsername = call(
        "formatName",
        bindings.user.profile.firstName,
        bindings.user.profile.lastName,
      );
      expect(formatUsername.toString()).toBe(
        "@[formatName({{user.profile.firstName}}, {{user.profile.lastName}})]@",
      );

      // Test mixed item access
      const mixedItemIsValid = and(
        equal(bindings.mixedItems.type, "numeric"),
        greaterThan(bindings.mixedItems.data.numberValue, 0),
      );
      expect(mixedItemIsValid.toString()).toBe(
        '@[{{mixedItems._current_.type}} == "numeric" && {{mixedItems._current_.data.numberValue}} > 0]@',
      );

      // Test deeply nested arithmetic with multiple array levels
      const complexCalculation = add(
        multiply(
          bindings.organization.departments.headCount,
          bindings.organization.departments.budget,
        ),
        divide(bindings.user.scores.value, bindings.metadata.limits.maxUsers),
      );
      expect(complexCalculation.toString()).toBe(
        "@[{{organization.departments._current_.headCount}} * {{organization.departments._current_.budget}} + {{user.scores._current_}} / {{metadata.limits.maxUsers}}]@",
      );

      // Test record access with std functions
      const isProductionWithHighVersion = and(
        bindings.metadata.isProduction,
        greaterThan(bindings.metadata.buildNumber, 1000),
      );
      expect(isProductionWithHighVersion.toString()).toBe(
        "@[{{metadata.isProduction}} && {{metadata.buildNumber}} > 1000]@",
      );

      // Test string array operations
      const hasAdminRole = equal(bindings.user.roles.name, "admin");
      expect(hasAdminRole.toString()).toBe(
        '@[{{user.roles._current_}} == "admin"]@',
      );

      // Test complex XOR operation
      const exclusiveNotifications = xor(
        bindings.user.preferences.emailNotifications,
        bindings.user.preferences.pushNotifications,
      );
      expect(exclusiveNotifications.toString()).toBe(
        "@[({{user.preferences.emailNotifications}} && !{{user.preferences.pushNotifications}}) || (!{{user.preferences.emailNotifications}} && {{user.preferences.pushNotifications}})]@",
      );

      // Test modulo operation
      const isEvenScore = equal(modulo(bindings.user.scores.value, 2), 0);
      expect(isEvenScore.toString()).toBe(
        "@[{{user.scores._current_}} % 2 == 0]@",
      );
    });
  });
});
