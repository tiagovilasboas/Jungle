const DEFAULT_DATABASE_URL = 'postgres://jungle:jungle@localhost:5432/jungle';
const DEFAULT_SQS_QUEUE_URL = 'http://localhost:4566/000000000000/wager-events';

export const databaseUrl = (): string => process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
export const sqsQueueUrl = (): string => process.env.SQS_QUEUE_URL ?? DEFAULT_SQS_QUEUE_URL;
