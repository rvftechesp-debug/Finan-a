/*
  Warnings:

  - You are about to drop the column `pendingVerification` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationMethod` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `WebAuthnCredential` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "WebAuthnCredential" DROP CONSTRAINT "WebAuthnCredential_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "pendingVerification",
DROP COLUMN "verificationMethod",
ALTER COLUMN "password" SET NOT NULL;

-- DropTable
DROP TABLE "WebAuthnCredential";
