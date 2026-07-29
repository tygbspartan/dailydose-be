import prisma from "../config/database.config";
import { AuthService } from "./auth.service";
import { config } from "../config/env.config";
import { ROLES } from "../constants/roles.constants";

export class SeedService {
  // Create the superadmin (platform operator) if it doesn't exist.
  static async createAdminUser(): Promise<void> {
    try {
      console.log("🔍 Checking for superadmin user...");

      // Check if the superadmin already exists
      const existingAdmin = await prisma.user.findUnique({
        where: { email: config.adminEmail },
      });

      if (existingAdmin) {
        // Ensure the seeded account is a superadmin (upgrades a legacy "admin").
        if (existingAdmin.role !== ROLES.SUPERADMIN) {
          await prisma.user.update({
            where: { id: existingAdmin.id },
            data: { role: ROLES.SUPERADMIN },
          });
          console.log("✅ Seeded account upgraded to superadmin");
        } else {
          console.log("✅ Superadmin user already exists");
        }
        return;
      }

      // Create superadmin user
      const passwordHash = await AuthService.hashPassword(config.adminPassword);

      const admin = await prisma.user.create({
        data: {
          email: config.adminEmail,
          passwordHash,
          firstName: config.adminFirstName,
          lastName: config.adminLastName,
          role: ROLES.SUPERADMIN,
          isEmailVerified: true, // Superadmin doesn't need email verification
        },
      });

      console.log("✅ Admin user created successfully");
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
    } catch (error) {
      console.error("❌ Failed to create admin user:", error);
      throw error;
    }
  }

  // Run all seed functions
  static async runSeed(): Promise<void> {
    try {
      await this.createAdminUser();
      // Add more seed functions here in the future
      // await this.createCategories();
      // await this.createBrands();
    } catch (error) {
      console.error("❌ Seed process failed:", error);
      throw error;
    }
  }
}
