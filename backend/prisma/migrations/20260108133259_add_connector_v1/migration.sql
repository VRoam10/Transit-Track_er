-- CreateTable
CREATE TABLE "public"."Connector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Connector_name_key" ON "public"."Connector"("name");
