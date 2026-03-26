-- CreateTable
CREATE TABLE "ExecutionNode" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "nodeType" "NodeType" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "errorStack" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExecutionNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionNode_executionId_nodeId_key" ON "ExecutionNode"("executionId", "nodeId");

-- CreateIndex
CREATE INDEX "ExecutionNode_executionId_orderIndex_idx" ON "ExecutionNode"("executionId", "orderIndex");

-- AddForeignKey
ALTER TABLE "ExecutionNode" ADD CONSTRAINT "ExecutionNode_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "Execution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
