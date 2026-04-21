import { Task } from "../models/Task";

export interface TaskResult extends Pick<Task, 'taskId'| 'output' | 'taskType' | 'status'> {}