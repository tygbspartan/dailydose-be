import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { AuthService } from "../services/auth.service";
import { ResponseUtil } from "../utils/response.util";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/customError.util";
import { ROLES } from "../constants/roles.constants";
import { CacheService } from "../services/cache.service";
import {
  CreateVendorRequest,
  UpdateVendorRequest,
  SetVendorStatusRequest,
  JwtPayload,
} from "../types/auth.types";

// Fields returned for a vendor (admin) account — never expose password hashes/tokens.
const VENDOR_SELECT = {
  id: true,
  email: true,
  companyName: true,
  logoUrl: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  isEmailVerified: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class AdminController {
  // Create a vendor (admin) account — superadmin only.
  static async createVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const jwtPayload = (req as any).jwtPayload as JwtPayload;
      const {
        email,
        password,
        companyName,
        firstName,
        lastName,
        phone,
        brandIds,
      }: CreateVendorRequest = req.body;

      if (!email || !password || !companyName) {
        throw new BadRequestError(
          "Email, password, and companyName are required",
        );
      }

      if (!AuthService.validateEmail(email)) {
        throw new BadRequestError("Invalid email format");
      }

      const passwordValidation = AuthService.validatePassword(password);
      if (!passwordValidation.valid) {
        throw new BadRequestError(
          passwordValidation.message || "Invalid password",
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        throw new ConflictError("A user with this email already exists");
      }

      const passwordHash = await AuthService.hashPassword(password);

      const vendor = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          companyName,
          // Mirror companyName into firstName when no contact name is given, so
          // existing name-display code (emails, headers) shows the vendor's name.
          firstName: firstName ?? companyName,
          lastName,
          phone,
          role: ROLES.ADMIN,
          // Superadmin-created vendors are trusted: no email verification gate.
          isEmailVerified: true,
          isActive: true,
          createdById: jwtPayload.userId,
        },
        select: VENDOR_SELECT,
      });

      // Assign the chosen brands to this vendor (only these become usable by them).
      if (Array.isArray(brandIds) && brandIds.length > 0) {
        const ids = [
          ...new Set(
            brandIds
              .map((v) => parseInt(String(v), 10))
              .filter((n) => Number.isInteger(n) && n > 0),
          ),
        ];
        if (ids.length > 0) {
          const found = await prisma.brand.findMany({
            where: { id: { in: ids } },
            select: { id: true, ownerId: true },
          });
          if (found.length !== ids.length) {
            throw new BadRequestError("One or more brand ids do not exist");
          }
          await prisma.$transaction(async (tx) => {
            // If any assigned brand was owned by another vendor, deactivate and
            // orphan that vendor's products under it before reassigning.
            for (const b of found) {
              if (b.ownerId && b.ownerId !== vendor.id) {
                await tx.product.updateMany({
                  where: { brandId: b.id, ownerId: b.ownerId },
                  data: { isActive: false, ownerId: null },
                });
              }
            }
            await tx.brand.updateMany({
              where: { id: { in: ids } },
              data: { ownerId: vendor.id },
            });
          });
          CacheService.invalidatePatternBackground("brands:*");
          CacheService.invalidatePatternBackground("products:*");
        }
      }

      return ResponseUtil.success(
        res,
        vendor,
        "Vendor account created successfully",
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  // List all vendor (admin) accounts — superadmin only.
  static async listVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, search } = req.query;

      const where: any = { role: ROLES.ADMIN };

      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: "insensitive" } },
          { companyName: { contains: search as string, mode: "insensitive" } },
          { firstName: { contains: search as string, mode: "insensitive" } },
          { lastName: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const vendors = await prisma.user.findMany({
        where,
        select: {
          ...VENDOR_SELECT,
          _count: {
            select: { ownedProducts: true, ownedBrands: true, ownedDiscounts: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return ResponseUtil.success(res, vendors, "Vendors retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Get a single vendor account — superadmin only.
  static async getVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = parseInt(req.params.id);

      const vendor = await prisma.user.findFirst({
        where: { id: vendorId, role: ROLES.ADMIN },
        select: {
          ...VENDOR_SELECT,
          _count: {
            select: { ownedProducts: true, ownedBrands: true, ownedDiscounts: true },
          },
          ownedBrands: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!vendor) {
        throw new NotFoundError("Vendor not found");
      }

      return ResponseUtil.success(res, vendor, "Vendor retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update a vendor's profile — superadmin only.
  static async updateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = parseInt(req.params.id);
      const {
        companyName,
        firstName,
        lastName,
        phone,
      }: UpdateVendorRequest = req.body;

      const existing = await prisma.user.findFirst({
        where: { id: vendorId, role: ROLES.ADMIN },
      });
      if (!existing) {
        throw new NotFoundError("Vendor not found");
      }

      const vendor = await prisma.user.update({
        where: { id: vendorId },
        data: { companyName, firstName, lastName, phone },
        select: VENDOR_SELECT,
      });

      return ResponseUtil.success(res, vendor, "Vendor updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Activate / deactivate a vendor (moderation) — superadmin only.
  static async setVendorStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = parseInt(req.params.id);
      const { isActive }: SetVendorStatusRequest = req.body;

      if (typeof isActive !== "boolean") {
        throw new BadRequestError("isActive (boolean) is required");
      }

      const existing = await prisma.user.findFirst({
        where: { id: vendorId, role: ROLES.ADMIN },
      });
      if (!existing) {
        throw new NotFoundError("Vendor not found");
      }

      // Deactivating a vendor also pulls all of their products from the store.
      // Reactivating only restores account access — products are left as-is so
      // the vendor can re-enable them selectively.
      let deactivatedProducts = 0;
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: vendorId },
          // Deactivating also revokes the vendor's existing tokens immediately.
          data: isActive
            ? { isActive }
            : { isActive, tokenVersion: { increment: 1 } },
        });

        if (!isActive) {
          const result = await tx.product.updateMany({
            where: { ownerId: vendorId, isActive: true },
            data: { isActive: false },
          });
          deactivatedProducts = result.count;
        }
      });

      // Product lists are cached; clear so the change shows immediately.
      if (!isActive) {
        CacheService.invalidatePatternBackground("products:*");
      }

      const vendor = await prisma.user.findUnique({
        where: { id: vendorId },
        select: VENDOR_SELECT,
      });

      return ResponseUtil.success(
        res,
        vendor,
        isActive
          ? "Vendor activated successfully"
          : `Vendor deactivated. ${deactivatedProducts} product(s) were set to inactive.`,
      );
    } catch (error) {
      next(error);
    }
  }

  // Assign which brands a vendor owns — superadmin only.
  static async setVendorBrands(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = parseInt(req.params.id);
      const { brandIds } = req.body as { brandIds?: unknown };

      if (!Array.isArray(brandIds)) {
        throw new BadRequestError("brandIds (array of ids) is required");
      }

      const ids = [
        ...new Set(
          brandIds
            .map((v) => parseInt(String(v), 10))
            .filter((n) => Number.isInteger(n) && n > 0),
        ),
      ];

      const vendor = await prisma.user.findFirst({
        where: { id: vendorId, role: ROLES.ADMIN },
        select: { id: true },
      });
      if (!vendor) {
        throw new NotFoundError("Vendor not found");
      }

      if (ids.length > 0) {
        const found = await prisma.brand.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        });
        if (found.length !== ids.length) {
          throw new BadRequestError("One or more brand ids do not exist");
        }
      }

      await prisma.$transaction(async (tx) => {
        // Brands this vendor currently owns.
        const owned = await tx.brand.findMany({
          where: { ownerId: vendorId },
          select: { id: true },
        });
        const ownedIds = owned.map((b) => b.id);
        const target = new Set(ids);

        const toRelease = ownedIds.filter((id) => !target.has(id)); // vendor loses these
        const toClaim = ids.filter((id) => !ownedIds.includes(id)); // vendor gains these

        // When claiming a brand from ANOTHER vendor, that vendor's products
        // under it are deactivated and orphaned to the platform (ownerId=null)
        // so the previous owner can no longer sell or edit them.
        if (toClaim.length > 0) {
          const claimed = await tx.brand.findMany({
            where: { id: { in: toClaim }, ownerId: { not: null } },
            select: { id: true, ownerId: true },
          });
          for (const b of claimed) {
            if (b.ownerId && b.ownerId !== vendorId) {
              await tx.product.updateMany({
                where: { brandId: b.id, ownerId: b.ownerId },
                data: { isActive: false, ownerId: null },
              });
            }
          }
          await tx.brand.updateMany({
            where: { id: { in: toClaim } },
            data: { ownerId: vendorId },
          });
        }

        // Releasing a brand: this vendor's products under it are likewise
        // deactivated and orphaned (they no longer own the brand).
        if (toRelease.length > 0) {
          await tx.product.updateMany({
            where: { brandId: { in: toRelease }, ownerId: vendorId },
            data: { isActive: false, ownerId: null },
          });
          await tx.brand.updateMany({
            where: { id: { in: toRelease } },
            data: { ownerId: null },
          });
        }
      });

      // Deactivated products were cached; refresh the storefront lists.
      CacheService.invalidatePatternBackground("products:*");

      CacheService.invalidatePatternBackground("brands:*");

      return ResponseUtil.success(
        res,
        { vendorId, brandIds: ids },
        "Vendor brands updated successfully",
      );
    } catch (error) {
      next(error);
    }
  }
}
