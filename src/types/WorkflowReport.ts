import { TaskResult } from './TaskResult';

export interface WorkflowReport {
    finalReport: string,
    workflowId: string,
    tasks: TaskResult[]
}