// types/express.d.ts

import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {}; // 👈 CRITICAL: This makes the file a module, required for augmentation
