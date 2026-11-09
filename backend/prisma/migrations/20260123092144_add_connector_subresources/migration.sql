-- CreateTable
CREATE TABLE "public"."Line" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "transformation" JSONB NOT NULL,
    "connectorID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "transformation" JSONB NOT NULL,
    "connectorID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Direction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "transformation" JSONB NOT NULL,
    "connectorID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Direction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NextPassage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "transformation" JSONB NOT NULL,
    "connectorID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextPassage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Line_connectorID_key" ON "public"."Line"("connectorID");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_connectorID_key" ON "public"."Stop"("connectorID");

-- CreateIndex
CREATE UNIQUE INDEX "Direction_connectorID_key" ON "public"."Direction"("connectorID");

-- CreateIndex
CREATE UNIQUE INDEX "NextPassage_connectorID_key" ON "public"."NextPassage"("connectorID");

-- AddForeignKey
ALTER TABLE "public"."Line" ADD CONSTRAINT "Line_connectorID_fkey" FOREIGN KEY ("connectorID") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stop" ADD CONSTRAINT "Stop_connectorID_fkey" FOREIGN KEY ("connectorID") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Direction" ADD CONSTRAINT "Direction_connectorID_fkey" FOREIGN KEY ("connectorID") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NextPassage" ADD CONSTRAINT "NextPassage_connectorID_fkey" FOREIGN KEY ("connectorID") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
