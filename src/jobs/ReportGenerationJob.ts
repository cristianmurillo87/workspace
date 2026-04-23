import { Not } from 'typeorm'
import { AppDataSource } from '../data-source'
import { Task } from '../models/Task'
import { TaskResult } from '../types/TaskResult'
import { WorkflowReport } from '../types/WorkflowReport'
import { Job } from './Job'
import { TaskStatus } from '../workers/taskRunner'
import { Workflow } from '../models/Workflow'

export class ReportGenerationJob implements Job {
    async run(task: Task): Promise<WorkflowReport> {
        const workflowRepository = AppDataSource.manager.getRepository(Workflow)
        const workflow = await workflowRepository.findOne({
            where: {
                workflowId: task.workflow.workflowId,
                tasks: {
                    taskId: Not(task.taskId),
                },
            },
            relations: ['tasks'],
        })

        const result = {
            finalReport: 'Aggregated data and results',
            workflowId: workflow?.workflowId,
            tasks: workflow?.tasks.map((task) => {
                const { taskId, taskType, output, status } = task
                return {
                    taskId,
                    output,
                    taskType,
                    status,
                } as TaskResult
            }),
        } as WorkflowReport
        return result
    }
}
