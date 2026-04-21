import { AppDataSource } from "../data-source";
import { Task } from "../models/Task";
import { TaskResult } from "../types/TaskResult";
import { WorkflowReport } from "../types/WorkflowReport";
import { Job } from "./Job";

export class ReportGenerationJob implements Job {
    async run(task: Task): Promise<WorkflowReport> {
        const taskRepository = AppDataSource.getRepository(Task);
        const tasks: Task[] = await taskRepository.find({
            where: {
                workflow: task.workflow
            }
        });

        const result = {
            finalReport: 'Aggregated data and results',
            workflowId: task.workflow.workflowId,
            tasks: tasks.map(task => {
                const {taskId, taskType, output, status} = task
                return {
                    taskId,
                    output,
                    taskType,
                    status
                } as TaskResult
            })
        } as WorkflowReport;
        return result;
    }
}