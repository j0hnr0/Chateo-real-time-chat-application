/*
  Warnings:

  - You are about to drop the column `attempts` on the `verification_codes` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `verification_codes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "verification_codes" DROP COLUMN "attempts",
DROP COLUMN "code";
