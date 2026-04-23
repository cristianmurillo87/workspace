import { Not } from 'typeorm'
import { AppDataSource } from '../data-source'
import { Task } from '../models/Task'
import { Workflow } from '../models/Workflow'
import { TaskRunner, TaskStatus } from './taskRunner'

export async function taskWorker() {
    const taskRepository = AppDataSource.getRepository(Task)
    const workflowRepository = AppDataSource.manager.getRepository(Workflow)
    const taskRunner = new TaskRunner(taskRepository)

    while (true) {
        const task = await taskRepository.findOne({
            where: { status: TaskStatus.Queued },
            order: {
                stepNumber: 'ASC',
            },
            relations: ['workflow'], // Ensure workflow is loaded
        })

        if (task) {
            try {
                // await taskRunner.run(task);
                if (task.taskType !== 'reportGeneration') {
                    await taskRunner.run(task)
                } else {
                    const workflow = await workflowRepository.findOne({
                        where: {
                            workflowId: task.workflow.workflowId,
                            tasks: {
                                taskId: Not(task.taskId),
                            },
                        },
                        relations: ['tasks'],
                    })

                    const allCompletedOrFailed = workflow?.tasks?.every(
                        (tsk) =>
                            tsk.status === TaskStatus.Completed ||
                            tsk.status === TaskStatus.Failed
                    )

                    if (allCompletedOrFailed) await taskRunner.run(task)
                }
            } catch (error) {
                console.error(
                    'Task execution failed. Task status has already been updated by TaskRunner.'
                )
                console.error(error)
            }
        }

        // Wait before checking for the next task again
        await new Promise((resolve) => setTimeout(resolve, 5000))
    }
}
