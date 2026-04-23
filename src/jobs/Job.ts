import { Task } from '../models/Task';

export interface Job {
	run(task: Task, dependency?: Task): Promise<any>;
}
