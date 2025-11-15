export type ConsoleLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

export type LogEvent =
    | {
          type: ConsoleLevel;
          data: any[];
      }
    | {
          type: 'unhandled-error';
          message: string;
          stack?: string;
      };
