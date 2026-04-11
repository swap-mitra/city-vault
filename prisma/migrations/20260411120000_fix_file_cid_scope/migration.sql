DROP INDEX "File_cid_key";

CREATE UNIQUE INDEX "File_userId_cid_key" ON "File"("userId", "cid");