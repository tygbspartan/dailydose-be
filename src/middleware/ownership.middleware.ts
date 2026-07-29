import { Request, Response, NextFunction } from "express";
import prisma from "../config/database.config";
import { NotFoundError } from "../utils/customError.util";
import { assertOwnership } from "../utils/ownership.util";
import { JwtPayload } from "../types/auth.types";

type OwnableModel = "product" | "brand" | "discount";

const LABEL: Record<OwnableModel, string> = {
  product: "Product",
  brand: "Brand",
  discount: "Discount",
};

/**
 * Route guard factory for mutating `:id` routes. Loads the record's ownerId and
 * enforces that the caller may manage it (superadmin = any; vendor = own only).
 * Runs after `authenticate` + `isAdmin`, so req.jwtPayload is set. Also serves
 * as the 404 check for the resource.
 */
export const assertOwner = (model: OwnableModel) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        throw new NotFoundError(`${LABEL[model]} not found`);
      }

      const record = await (prisma[model] as any).findUnique({
        where: { id },
        select: { ownerId: true },
      });
      if (!record) {
        throw new NotFoundError(`${LABEL[model]} not found`);
      }

      assertOwnership(record.ownerId, (req as any).jwtPayload as JwtPayload);
      next();
    } catch (error) {
      next(error);
    }
  };
